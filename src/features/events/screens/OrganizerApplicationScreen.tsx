import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Device from "expo-device";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { Loader } from "../../../components/ui/Loader";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { EventsRoutes } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import type { OrganizerStatus } from "../../../models/user";
import { OrganizerApplicationDocumentStep } from "../components/organizer-application/OrganizerApplicationDocumentStep";
import { OrganizerApplicationFooter } from "../components/organizer-application/OrganizerApplicationFooter";
import { OrganizerApplicationIntroStep } from "../components/organizer-application/OrganizerApplicationIntroStep";
import { OrganizerApplicationMotivationStep } from "../components/organizer-application/OrganizerApplicationMotivationStep";
import { OrganizerApplicationProgress } from "../components/organizer-application/OrganizerApplicationProgress";
import { OrganizerApplicationReviewStep } from "../components/organizer-application/OrganizerApplicationReviewStep";
import { OrganizerApplicationStatusCard } from "../components/organizer-application/OrganizerApplicationStatusCard";
import {
  createOrUpdateOrganizerDraft,
  getCurrentOrganizerApplication,
  submitOrganizerApplication,
  uploadVerificationDocument,
} from "../services/organizer.service";
import type {
  CurrentOrganizerApplicationResponse,
  DocumentChecklistItem,
  VerificationDocumentType,
  VerificationUploadFile,
} from "../types/organizer";
import {
  buildVerificationUploadFileFromCapture,
  pickVerificationDocumentFile,
  pickVerificationGalleryFile,
} from "../utils/organizer-verification-picker";
import {
  resolveGuidedCaptureMode,
} from "../utils/organizer-verification-capture";
import { mapVerificationUploadStepError } from "../utils/organizer-verification-upload-diagnostics";
import {
  canEditOrganizerDraftMotivation,
  canSaveOrganizerDraftInfo,
  canStartDocumentUpload,
  isDraftBlockedByAge,
  isSubmitEligible,
  mergeDraftUpdateChecklist,
  resolveApplicationTypeForAccount,
  resolveOrganizerScreenPhase,
  shouldShowResubmit,
  toDocumentCardReviewStatus,
  validateVerificationUploadFile,
} from "../utils/organizer-verification";
import {
  canProceedFromDocumentStep,
  findFirstIncompleteDocumentStep,
  getNextWizardStep,
  getPreviousWizardStep,
  getWizardSteps,
  isDocumentWizardStep,
  isWizardSubmitEnabled,
  resolveInitialWizardStep,
  resolveWizardDocumentType,
  type OrganizerWizardStepId,
  validateOrganizerMotivation,
} from "../utils/organizer-verification-wizard";
import { meetsOrganizerMinimumAge } from "../utils/viewerAge";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "OrganizerApplicationScreen"
>;

const legacyStatusMessage = (status: OrganizerStatus) => {
  if (status === "pending") {
    return "Başvurun inceleniyor. Onaylandığında etkinlik oluşturabilirsin.";
  }
  if (status === "approved") {
    return "Organizatör hesabın onaylandı. Menüden etkinlik oluşturabilirsin.";
  }
  if (status === "rejected") {
    return "Önceki başvurun reddedildi. Yeni bir başvuru gönderebilirsin.";
  }
  return null;
};

export function OrganizerApplicationScreen({ navigation, route }: Props) {
  const { user, refreshSession } = useAuth();
  const accountType = user?.accountType ?? "personal";
  const applicationType = resolveApplicationTypeForAccount(accountType);
  const wizardSteps = useMemo(() => getWizardSteps(applicationType), [applicationType]);

  const [current, setCurrent] = useState<CurrentOrganizerApplicationResponse | null>(null);
  const [motivation, setMotivation] = useState("");
  const [wizardStep, setWizardStep] = useState<OrganizerWizardStepId>("intro");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeUploadType, setActiveUploadType] = useState<VerificationDocumentType | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Partial<Record<VerificationDocumentType, string>>>({});

  const organizerStatus = user?.organizerStatus ?? "not_applied";
  const reviewStatus = current?.application?.reviewStatus ?? null;
  const applicationId = current?.application?.id ?? null;
  const checklist = current?.documentChecklist ?? [];
  const effectiveReviewStatus = current?.application?.reviewStatus ?? "DRAFT";

  const isBlockedByAge = isDraftBlockedByAge(
    applicationType,
    user?.privateProfile?.birthDate,
    meetsOrganizerMinimumAge,
  );
  const canStartApplication = organizerStatus === "not_applied" || organizerStatus === "rejected";

  const phaseInput = useMemo(
    () => ({
      organizerStatus,
      reviewStatus,
      checklist,
    }),
    [organizerStatus, reviewStatus, checklist],
  );

  const screenPhase = resolveOrganizerScreenPhase(phaseInput);
  const infoMessage = useMemo(() => legacyStatusMessage(organizerStatus), [organizerStatus]);
  const submitReady = isSubmitEligible(checklist);
  const showReadOnly = screenPhase === "read_only";
  const isResubmit = shouldShowResubmit(screenPhase);
  const canSubmit = isWizardSubmitEnabled(checklist, screenPhase);

  const currentDocumentType = isDocumentWizardStep(wizardStep)
    ? resolveWizardDocumentType(wizardStep)
    : null;
  const currentChecklistItem = currentDocumentType
    ? checklist.find((item) => item.documentType === currentDocumentType)
    : undefined;

  const loadCurrent = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await getCurrentOrganizerApplication();
      setCurrent(response);

      if (response.application?.reason) {
        setMotivation(response.application.reason);
      }

      setWizardStep(
        resolveInitialWizardStep({
          screenPhase: resolveOrganizerScreenPhase({
            organizerStatus,
            reviewStatus: response.application?.reviewStatus ?? null,
            checklist: response.documentChecklist,
          }),
          applicationType,
          checklist: response.documentChecklist,
          reviewStatus: response.application?.reviewStatus ?? null,
        }),
      );

      setFormError(null);
    } catch {
      setLoadError("Başvuru bilgileri yüklenemedi.");
      setCurrent(null);
    } finally {
      setIsLoading(false);
    }
  }, [applicationType, organizerStatus]);

  useEffect(() => {
    void loadCurrent();
  }, [loadCurrent]);

  const onSaveMotivation = async (): Promise<{ saved: boolean; checklist: DocumentChecklistItem[] }> => {
    const motivationError = validateOrganizerMotivation(motivation);
    if (motivationError) {
      setFormError(motivationError);
      return { saved: false, checklist };
    }

    if (isBlockedByAge) {
      setFormError("Organizatör olmak için en az 18 yaşında olmalısın.");
      return { saved: false, checklist };
    }

    if (screenPhase === "draft_info" && !canStartApplication) {
      return { saved: false, checklist };
    }

    const canSaveInfo = canSaveOrganizerDraftInfo({
      screenPhase,
      reviewStatus,
      draftStep: "info",
    });

    if (!canSaveInfo) {
      setFormError("Bu aşamada motivasyon düzenlenemez.");
      return { saved: false, checklist };
    }

    setIsSavingDraft(true);
    setFormError(null);
    setSubmitSuccess(null);

    try {
      const draft = await createOrUpdateOrganizerDraft({
        type: applicationType,
        reason: motivation.trim(),
      });

      const nextChecklist = mergeDraftUpdateChecklist(
        current?.documentChecklist ?? [],
        draft.documentChecklist,
      );

      setCurrent((previous) => ({
        application: {
          id: draft.application.id,
          type: draft.application.type,
          reviewStatus: draft.application.reviewStatus,
          status: draft.application.status ?? "NOT_APPLIED",
          reason: draft.application.reason,
          changeRequestReason: draft.application.changeRequestReason ?? null,
          createdAt: draft.application.createdAt,
          updatedAt: draft.application.updatedAt,
        },
        documentChecklist: nextChecklist,
      }));

      return { saved: true, checklist: nextChecklist };
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Taslak kaydedilemedi.");
      return { saved: false, checklist };
    } finally {
      setIsSavingDraft(false);
    }
  };

  const runDocumentUpload = async (documentType: VerificationDocumentType, file: VerificationUploadFile) => {
    if (!applicationId) {
      throw new Error("Başvuru bulunamadı.");
    }

    const validationError = validateVerificationUploadFile(file, documentType);
    if (validationError) {
      throw new Error(validationError);
    }

    const result = await uploadVerificationDocument(applicationId, file, {
      documentType,
      originalFileName: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    });

    setCurrent((previous) =>
      previous
        ? {
            ...previous,
            documentChecklist: result.documentChecklist,
          }
        : previous,
    );

    setUploadErrors((previous) => {
      const next = { ...previous };
      delete next[documentType];
      return next;
    });
  };

  const handleUpload = async (
    documentType: VerificationDocumentType,
    pickFile: () => Promise<VerificationUploadFile | null>,
  ) => {
    if (!canStartDocumentUpload(activeUploadType)) {
      return;
    }

    if (!applicationId || showReadOnly) {
      return;
    }

    setActiveUploadType(documentType);
    setUploadErrors((previous) => ({ ...previous, [documentType]: undefined }));
    setFormError(null);

    try {
      const file = await pickFile();
      if (!file) {
        return;
      }

      await runDocumentUpload(documentType, file);
    } catch (error) {
      setUploadErrors((previous) => ({
        ...previous,
        [documentType]: mapVerificationUploadStepError(error),
      }));
    } finally {
      setActiveUploadType(null);
    }
  };

  useEffect(() => {
    const captureResult = route.params?.captureResult;
    if (!captureResult) {
      return;
    }

    navigation.setParams({ captureResult: undefined });

    void handleUpload(captureResult.documentType, async () =>
      buildVerificationUploadFileFromCapture({
        uri: captureResult.uri,
        documentType: captureResult.documentType,
      }),
    );
  }, [navigation, route.params?.captureResult]);

  useEffect(() => {
    const documentType = route.params?.openGalleryForDocumentType;
    if (!documentType) {
      return;
    }

    navigation.setParams({ openGalleryForDocumentType: undefined });

    // SIMULATOR-ONLY path: the guided capture screen only offers the gallery
    // fallback on simulators (no camera hardware). On real devices identity/
    // selfie documents must go through the guided camera, so ignore stray
    // gallery requests for those types here.
    if (Device.isDevice && resolveGuidedCaptureMode(documentType)) {
      return;
    }

    void handleUpload(documentType, () => pickVerificationGalleryFile(documentType));
  }, [navigation, route.params?.openGalleryForDocumentType]);

  const onSubmitApplication = () => {
    if (!applicationId || !submitReady || isSubmitting) {
      return;
    }

    Alert.alert(
      isResubmit ? "Başvuruyu Yeniden Gönder" : "Başvuruyu Gönder",
      isResubmit
        ? "Düzeltilen belgelerle başvurunu yeniden göndermek istediğine emin misin?"
        : "Başvurunu göndermek istediğine emin misin? Gönderimden sonra belgelerini düzenleyemezsin.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: isResubmit ? "Yeniden Gönder" : "Gönder",
          style: "default",
          onPress: () => {
            void (async () => {
              setIsSubmitting(true);
              setFormError(null);
              setSubmitSuccess(null);

              try {
                const submitted = await submitOrganizerApplication(applicationId);
                setCurrent(submitted);
                await refreshSession();
                setSubmitSuccess(
                  isResubmit
                    ? "Başvurun yeniden gönderildi. İnceleme süreci devam ediyor."
                    : "Başvurun gönderildi. İnceleme süreci başladı.",
                );
              } catch (error) {
                setFormError(error instanceof Error ? error.message : "Başvuru gönderilemedi.");
              } finally {
                setIsSubmitting(false);
              }
            })();
          },
        },
      ],
    );
  };

  const goToNextStep = () => {
    const next = getNextWizardStep(wizardSteps, wizardStep);
    if (next) {
      setWizardStep(next);
    }
  };

  const goToPreviousStep = () => {
    const previous = getPreviousWizardStep(wizardSteps, wizardStep);
    if (!previous) {
      navigation.goBack();
      return;
    }

    if (
      screenPhase === "changes_requested" ||
      screenPhase === "legacy_submitted_completion"
    ) {
      if (previous === "motivation" || previous === "intro") {
        navigation.goBack();
        return;
      }
    }

    setWizardStep(previous);
  };

  const resolveStepAfterMotivation = (nextChecklist: DocumentChecklistItem[]) => {
    return (
      findFirstIncompleteDocumentStep(nextChecklist, applicationType) ??
      "review"
    );
  };

  const onPrimaryAction = () => {
    void (async () => {
      setFormError(null);

      if (wizardStep === "intro") {
        setWizardStep("motivation");
        return;
      }

      if (wizardStep === "motivation") {
        const result = await onSaveMotivation();
        if (!result.saved) {
          return;
        }

        setWizardStep(resolveStepAfterMotivation(result.checklist));
        return;
      }

      if (isDocumentWizardStep(wizardStep)) {
        goToNextStep();
        return;
      }

      if (wizardStep === "review") {
        onSubmitApplication();
      }
    })();
  };

  const primaryDisabled = useMemo(() => {
    if (wizardStep === "motivation") {
      return isBlockedByAge || isSavingDraft || Boolean(validateOrganizerMotivation(motivation));
    }

    if (isDocumentWizardStep(wizardStep)) {
      return (
        !canProceedFromDocumentStep(currentChecklistItem) ||
        activeUploadType !== null
      );
    }

    if (wizardStep === "review") {
      return !canSubmit || !submitReady || isSubmitting || activeUploadType !== null;
    }

    return false;
  }, [
    wizardStep,
    isBlockedByAge,
    isSavingDraft,
    motivation,
    currentChecklistItem,
    effectiveReviewStatus,
    activeUploadType,
    canSubmit,
    submitReady,
    isSubmitting,
  ]);

  const primaryLabel = useMemo(() => {
    if (wizardStep === "intro") {
      return "Başlayalım";
    }
    if (wizardStep === "motivation") {
      return isSavingDraft ? "Kaydediliyor..." : "Devam Et";
    }
    if (wizardStep === "review") {
      if (isSubmitting) {
        return "Gönderiliyor...";
      }
      return isResubmit ? "Tekrar Gönder" : "Gönder";
    }
    return "Devam";
  }, [wizardStep, isSavingDraft, isSubmitting, isResubmit]);

  const renderWizardStep = () => {
    if (wizardStep === "intro") {
      return <OrganizerApplicationIntroStep applicationType={applicationType} />;
    }

    if (wizardStep === "motivation") {
      return (
        <OrganizerApplicationMotivationStep
          applicationType={applicationType}
          error={formError}
          isBlockedByAge={isBlockedByAge}
          motivation={motivation}
          onChangeMotivation={setMotivation}
        />
      );
    }

    if (isDocumentWizardStep(wizardStep) && currentDocumentType) {
      return (
        <OrganizerApplicationDocumentStep
          disabled={activeUploadType !== null && activeUploadType !== currentDocumentType}
          documentType={currentDocumentType}
          isUploading={activeUploadType === currentDocumentType}
          item={currentChecklistItem}
          onOpenGuidedCamera={(documentType) => {
            const mode = resolveGuidedCaptureMode(documentType);
            if (!mode) {
              return;
            }

            navigation.navigate(EventsRoutes.VerificationGuidedCaptureScreen, {
              documentType,
              mode,
            });
          }}
          onPickFile={(documentType) =>
            void handleUpload(documentType, () => pickVerificationDocumentFile(documentType))
          }
          onPickGallery={(documentType) =>
            void handleUpload(documentType, () => pickVerificationGalleryFile(documentType))
          }
          reviewStatus={toDocumentCardReviewStatus(effectiveReviewStatus)}
          uploadError={uploadErrors[currentDocumentType] ?? null}
        />
      );
    }

    if (wizardStep === "review") {
      return (
        <OrganizerApplicationReviewStep
          checklist={checklist}
          isResubmit={isResubmit}
          motivation={motivation}
          onEditMotivation={
            canEditOrganizerDraftMotivation({ reviewStatus, screenPhase })
              ? () => setWizardStep("motivation")
              : undefined
          }
          submitReady={submitReady}
        />
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Başvurusu" />
          <Card style={styles.stateCard}>
            <Loader label="Başvuru bilgileri yükleniyor..." />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.pagePadding} keyboardShouldPersistTaps="handled">
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Başvurusu" />
          <Card style={styles.warningCard}>
            <AppText variant="body">{loadError}</AppText>
            <AppButton label="Tekrar Dene" onPress={() => void loadCurrent()} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screenPhase === "approved") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.pagePadding} keyboardShouldPersistTaps="handled">
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Başvurusu" />
          <OrganizerApplicationStatusCard
            checklist={checklist}
            message={infoMessage ?? "Organizatör hesabın onaylandı."}
            onBack={() => navigation.goBack()}
            readOnly
            reviewStatus={toDocumentCardReviewStatus(effectiveReviewStatus)}
            title="Onaylandı"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (showReadOnly) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.pagePadding} keyboardShouldPersistTaps="handled">
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Başvurusu" />
          <OrganizerApplicationStatusCard
            checklist={checklist}
            message={submitSuccess ?? "Başvurun inceleniyor. Onaylandığında etkinlik oluşturabilirsin."}
            onBack={() => navigation.goBack()}
            readOnly
            reviewStatus={toDocumentCardReviewStatus(effectiveReviewStatus)}
            title="Başvuru Durumu"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const showChangesBanner = screenPhase === "changes_requested" && current?.application?.changeRequestReason;
  const showLegacyBanner = screenPhase === "legacy_submitted_completion";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={styles.flex}
      >
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Başvurusu" />
          <OrganizerApplicationProgress currentStepId={wizardStep} steps={wizardSteps} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pagePadding}>
            {showChangesBanner ? (
              <Card style={styles.warningCard}>
                <AppText variant="sectionTitle">Düzeltme İstendi</AppText>
                <AppText variant="body">{current?.application?.changeRequestReason}</AppText>
              </Card>
            ) : null}

            {showLegacyBanner ? (
              <Card style={styles.infoCard}>
                <AppText variant="body">
                  Başvurunu tamamlamak için eksik belgelerini yükle. Mevcut belgelerini değiştirmene gerek yok.
                </AppText>
              </Card>
            ) : null}

            {renderWizardStep()}

            {formError && wizardStep !== "motivation" ? (
              <AppText style={styles.errorText} variant="caption">
                {formError}
              </AppText>
            ) : null}

            {submitSuccess ? (
              <Card style={styles.successCard}>
                <AppText style={styles.successText} variant="body">
                  {submitSuccess}
                </AppText>
              </Card>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footerPadding}>
          <OrganizerApplicationFooter
            onBack={goToPreviousStep}
            onPrimary={() => onPrimaryAction()}
            primaryDisabled={primaryDisabled}
            primaryLabel={primaryLabel}
            primaryLoading={isSavingDraft || isSubmitting}
            showBack={wizardStep !== "intro"}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pagePadding: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.md,
  },
  footerPadding: {
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
  infoCard: {
    backgroundColor: "#EFF6FF",
    gap: theme.spacing.xs,
  },
  warningCard: {
    backgroundColor: "#FEF3C7",
    gap: theme.spacing.sm,
  },
  successCard: {
    backgroundColor: "#ECFDF5",
  },
  successText: {
    color: "#047857",
  },
  errorText: {
    color: theme.colors.danger,
  },
});
