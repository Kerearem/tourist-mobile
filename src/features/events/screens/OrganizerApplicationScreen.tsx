import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import type { OrganizerStatus } from "../../../models/user";
import { OrganizerDocumentCard } from "../components/OrganizerDocumentCard";
import {
  createOrUpdateOrganizerDraft,
  getCurrentOrganizerApplication,
  submitOrganizerApplication,
  uploadVerificationDocument,
} from "../services/organizer.service";
import type {
  CurrentOrganizerApplicationResponse,
  VerificationDocumentType,
  VerificationUploadFile,
} from "../types/organizer";
import {
  pickVerificationDocumentFile,
  pickVerificationSelfieFile,
} from "../utils/organizer-verification-picker";
import {
  canEditOrganizerDraftMotivation,
  canSaveOrganizerDraftInfo,
  isDocumentsPhase,
  isDraftBlockedByAge,
  isSubmitEligible,
  mergeDraftUpdateChecklist,
  resolveApplicationTypeForAccount,
  resolveInitialDraftStep,
  resolveOrganizerScreenPhase,
  shouldShowDraftSubmit,
  shouldShowResubmit,
  toDocumentCardReviewStatus,
  validateVerificationUploadFile,
} from "../utils/organizer-verification";
import { meetsOrganizerMinimumAge } from "../utils/viewerAge";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "OrganizerApplicationScreen"
>;

type DraftStep = "info" | "documents";

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;

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

export function OrganizerApplicationScreen({ navigation }: Props) {
  const { user, refreshSession } = useAuth();
  const accountType = user?.accountType ?? "personal";
  const applicationType = resolveApplicationTypeForAccount(accountType);

  const [current, setCurrent] = useState<CurrentOrganizerApplicationResponse | null>(null);
  const [motivation, setMotivation] = useState("");
  const [draftStep, setDraftStep] = useState<DraftStep>("info");
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

  const isBlockedByAge = isDraftBlockedByAge(
    applicationType,
    user?.privateProfile.birthDate,
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

  const loadCurrent = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await getCurrentOrganizerApplication();
      setCurrent(response);

      if (response.application?.reason) {
        setMotivation(response.application.reason);
      }

      setDraftStep(
        resolveInitialDraftStep({
          organizerStatus,
          reviewStatus: response.application?.reviewStatus ?? null,
          checklist: response.documentChecklist,
        }),
      );

      setFormError(null);
    } catch {
      setLoadError("Başvuru bilgileri yüklenemedi.");
      setCurrent(null);
    } finally {
      setIsLoading(false);
    }
  }, [organizerStatus]);

  useEffect(() => {
    void loadCurrent();
  }, [loadCurrent]);

  const onContinueDraft = async () => {
    const saveInput = { screenPhase, reviewStatus, draftStep };

    if (!canSaveOrganizerDraftInfo(saveInput)) {
      return;
    }

    const reason = motivation.trim();

    if (reason.length < MIN_REASON_LENGTH) {
      setFormError("Lütfen en az 10 karakterlik bir motivasyon yaz.");
      return;
    }

    if (reason.length > MAX_REASON_LENGTH) {
      setFormError("Motivasyon en fazla 2000 karakter olabilir.");
      return;
    }

    if (isBlockedByAge) {
      setFormError("Organizatör olmak için en az 18 yaşında olmalısın.");
      return;
    }

    if (screenPhase === "draft_info" && !canStartApplication) {
      return;
    }

    setIsSavingDraft(true);
    setFormError(null);
    setSubmitSuccess(null);

    try {
      const draft = await createOrUpdateOrganizerDraft({
        type: applicationType,
        reason,
      });

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
        documentChecklist: mergeDraftUpdateChecklist(
          previous?.documentChecklist ?? [],
          draft.documentChecklist,
        ),
      }));
      setDraftStep("documents");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Taslak kaydedilemedi.");
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
    if (activeUploadType) {
      return;
    }

    if (!applicationId || !isDocumentsPhase(screenPhase)) {
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
        [documentType]: error instanceof Error ? error.message : "Belge yüklenemedi.",
      }));
    } finally {
      setActiveUploadType(null);
    }
  };

  const onSubmitApplication = (isResubmit: boolean) => {
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

  if (isLoading) {
    return (
      <Screen>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Başvurusu" />
        <Card style={styles.stateCard}>
          <Loader label="Başvuru bilgileri yükleniyor..." />
        </Card>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen scroll>
        <View style={styles.container}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Başvurusu" />
          <Card style={styles.warningCard}>
            <AppText variant="body">{loadError}</AppText>
            <AppButton label="Tekrar Dene" onPress={() => void loadCurrent()} />
          </Card>
        </View>
      </Screen>
    );
  }

  if (screenPhase === "approved") {
    return (
      <Screen scroll>
        <View style={styles.container}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Başvurusu" />
          <Card style={styles.infoCard}>
            <AppText variant="body">{infoMessage}</AppText>
          </Card>
          <AppButton label="Geri Dön" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </Screen>
    );
  }

  const effectiveReviewStatus = current?.application?.reviewStatus ?? "DRAFT";
  const showDocumentsView = isDocumentsPhase(screenPhase) && draftStep === "documents";
  const showSubmitSection = shouldShowDraftSubmit(screenPhase) || shouldShowResubmit(screenPhase);

  return (
    <Screen scroll>
      <View style={styles.container}>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Başvurusu" />

        <Card style={styles.card}>
          <AppText variant="title">Organizatör Başvurusu</AppText>
          <AppText variant="bodyMuted">
            Organizatörler, şehirlerinde güvenli ve faydalı topluluk etkinlikleri düzenler.
          </AppText>
          <View style={styles.badges}>
            <Badge label={applicationType === "BUSINESS" ? "İşletme başvurusu" : "Bireysel başvuru"} />
            <Badge label="Güvenli belge yükleme" />
          </View>
        </Card>

        {effectiveReviewStatus === "CHANGES_REQUESTED" && current?.application?.changeRequestReason ? (
          <Card style={styles.warningCard}>
            <AppText variant="sectionTitle">Düzeltme İstendi</AppText>
            <AppText variant="body">{current.application.changeRequestReason}</AppText>
          </Card>
        ) : null}

        {screenPhase === "legacy_submitted_completion" ? (
          <Card style={styles.infoCard}>
            <AppText variant="body">
              Başvurunu tamamlamak için eksik belgelerini yükle. Mevcut belgelerini değiştirmene gerek yok.
            </AppText>
          </Card>
        ) : null}

        {showReadOnly ? (
          <>
            <Card style={styles.infoCard}>
              <AppText variant="body">
                {submitSuccess ?? "Başvurun inceleniyor. Onaylandığında etkinlik oluşturabilirsin."}
              </AppText>
            </Card>

            {checklist.map((item) => (
              <OrganizerDocumentCard
                key={item.documentType}
                disabled
                isUploading={false}
                item={item}
                onPickDocument={() => undefined}
                onPickSelfie={() => undefined}
                reviewStatus={toDocumentCardReviewStatus(effectiveReviewStatus)}
                uploadError={null}
              />
            ))}

            <AppButton label="Geri Dön" onPress={() => navigation.goBack()} variant="secondary" />
          </>
        ) : showDocumentsView ? (
          <>
            <Card style={styles.card}>
              <AppText variant="sectionTitle">Belgeler</AppText>
              <AppText variant="bodyMuted">
                Zorunlu belgeleri yükle. Her belge güvenli ve imzalı bağlantı ile yüklenir.
              </AppText>
              {canEditOrganizerDraftMotivation({ reviewStatus, screenPhase }) && applicationId ? (
                <AppButton
                  label="Motivasyonu Düzenle"
                  onPress={() => setDraftStep("info")}
                  variant="secondary"
                />
              ) : null}
            </Card>

            {checklist.map((item) => (
              <OrganizerDocumentCard
                key={item.documentType}
                disabled={activeUploadType !== null && activeUploadType !== item.documentType}
                isUploading={activeUploadType === item.documentType}
                item={item}
                onPickDocument={(documentType) =>
                  void handleUpload(documentType, () => pickVerificationDocumentFile(documentType))
                }
                onPickSelfie={(source) =>
                  void handleUpload("SELFIE", () => pickVerificationSelfieFile(source))
                }
                reviewStatus={toDocumentCardReviewStatus(effectiveReviewStatus)}
                uploadError={uploadErrors[item.documentType] ?? null}
              />
            ))}

            {formError ? (
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

            {showSubmitSection ? (
              <Card style={styles.card}>
                <AppText variant="sectionTitle">
                  {shouldShowResubmit(screenPhase) ? "Yeniden Gönder" : "Son Kontrol"}
                </AppText>
                <AppText variant="bodyMuted">
                  {submitReady
                    ? shouldShowResubmit(screenPhase)
                      ? "Düzeltilen belgelerle başvurunu yeniden gönderebilirsin."
                      : "Tüm zorunlu belgeler yüklendi. Başvurunu gönderebilirsin."
                    : shouldShowResubmit(screenPhase)
                      ? "Yeniden göndermek için reddedilen veya eksik belgeleri tamamla."
                      : "Göndermek için tüm zorunlu belgelerin yüklenmiş olması gerekir."}
                </AppText>
                <AppButton
                  disabled={!submitReady || isSubmitting || activeUploadType !== null}
                  label={
                    isSubmitting
                      ? "Gönderiliyor..."
                      : shouldShowResubmit(screenPhase)
                        ? "Başvuruyu Yeniden Gönder"
                        : "Başvuruyu Gönder"
                  }
                  onPress={() => onSubmitApplication(shouldShowResubmit(screenPhase))}
                />
              </Card>
            ) : null}
          </>
        ) : (
          <Card style={styles.card}>
            <AppText variant="sectionTitle">Başvuru Bilgileri</AppText>
            <AppText variant="bodyMuted">
              {applicationType === "BUSINESS"
                ? "İşletme hesabın için organizatör başvurusu yapıyorsun."
                : "Bireysel hesabın için organizatör başvurusu yapıyorsun."}
            </AppText>

            {isBlockedByAge ? (
              <AppText style={styles.errorText} variant="body">
                Organizatör olmak için en az 18 yaşında olmalısın.
              </AppText>
            ) : null}

            <AppInput
              editable={!isBlockedByAge}
              label="Motivasyon"
              multiline
              numberOfLines={5}
              onChangeText={setMotivation}
              placeholder="Motivasyonunu ve düzenlemek istediğin etkinlik türlerini yaz."
              style={styles.textarea}
              textAlignVertical="top"
              value={motivation}
            />

            {formError ? (
              <AppText style={styles.errorText} variant="caption">
                {formError}
              </AppText>
            ) : null}

            <AppButton
              disabled={isBlockedByAge || isSavingDraft}
              label={isSavingDraft ? "Kaydediliyor..." : "Devam Et"}
              onPress={() => void onContinueDraft()}
            />
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    gap: theme.spacing.sm,
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
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  textarea: {
    minHeight: 120,
  },
  errorText: {
    color: theme.colors.danger,
  },
});
