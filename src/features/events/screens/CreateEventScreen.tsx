import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import type { NavigationAction } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { Loader } from "../../../components/ui/Loader";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import { uploadImage } from "../../../services/media/cloudinary";
import { EventLocationPickerModal } from "../components/EventLocationPickerModal";
import { EventTimezonePickerModal } from "../components/create-event/EventTimezonePickerModal";
import { EventCreationBottomBar } from "../components/create-event/EventCreationBottomBar";
import { EventCreationStepper } from "../components/create-event/EventCreationStepper";
import { BasicsStep } from "../components/create-event/steps/BasicsStep";
import { DateLocationStep } from "../components/create-event/steps/DateLocationStep";
import { ParticipationStep } from "../components/create-event/steps/ParticipationStep";
import { PreviewStep } from "../components/create-event/steps/PreviewStep";
import { TicketsStep } from "../components/create-event/steps/TicketsStep";
import { useEventCreationDraft } from "../hooks/useEventCreationDraft";
import { createInitialEventCreationDraft } from "../utils/eventCreationDraft";
import { resolveDeviceTimezone } from "../utils/eventDeviceTimezone";
import { createEvent } from "../services/events.service";
import { getOrganizerStatus } from "../services/organizer.service";
import {
  EVENT_CREATION_STEP_TITLES,
  type ActiveEventCheckState,
  type EventCreationFieldErrors,
  type EventCreationStep,
} from "../types/eventCreation";
import { buildCreateEventPayload } from "../utils/eventCreationPayload";
import { EVENT_TIMEZONE_INVALID_MESSAGE } from "../utils/eventTimezone";
import {
  EVENT_CREATION_EXIT_ALERT,
  resolveEventCreationExitDecision,
  shouldPreventNavigationRemoval,
} from "../utils/eventCreationNavigation";
import {
  parseCapacityInput,
  resolveActiveEventCheckFailureMessage,
  resolveCapacityValidationError,
  resolveEventCreationStepState,
  resolveFirstInvalidStep,
  validateCompleteEventDraft,
  validateEventCreationStep,
} from "../utils/eventCreationValidation";
import { calculateAgeFromBirthDate } from "../utils/viewerAge";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "CreateEventScreen"
>;

export function CreateEventScreen({ navigation }: Props) {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const initialDraft = useMemo(
    () =>
      createInitialEventCreationDraft({
        city: user?.privateProfile.destinationCity ?? user?.publicProfile.currentCity ?? "",
        countryCode: user?.privateProfile.destinationCountryCode ?? "",
        timezone: resolveDeviceTimezone() ?? "",
      }),
    [user?.privateProfile.destinationCity, user?.privateProfile.destinationCountryCode, user?.publicProfile.currentCity],
  );

  const { draft, patchDraft, setStartsAt, isDirty } = useEventCreationDraft(initialDraft);
  const [currentStep, setCurrentStep] = useState<EventCreationStep>(1);
  const [fieldErrors, setFieldErrors] = useState<EventCreationFieldErrors>({});
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isTimezonePickerOpen, setIsTimezonePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeEventCheck, setActiveEventCheck] = useState<ActiveEventCheckState>({ status: "loading" });
  const allowNavigationRef = useRef(false);
  const isExitAlertVisibleRef = useRef(false);

  const isOrganizerApproved = user?.organizerStatus === "approved";

  const isWizardActive =
    isOrganizerApproved &&
    activeEventCheck.status === "ready" &&
    !activeEventCheck.hasActiveEvent;

  const getExitDecision = useCallback(
    () =>
      resolveEventCreationExitDecision({
        isDirty,
        isSubmitting,
        allowNavigationAfterSuccess: allowNavigationRef.current,
      }),
    [isDirty, isSubmitting],
  );

  const completeExit = useCallback(
    (action?: NavigationAction) => {
      if (action) {
        allowNavigationRef.current = true;
        navigation.dispatch(action);
        return;
      }

      allowNavigationRef.current = true;
      navigation.goBack();
    },
    [navigation],
  );

  const requestExit = useCallback(
    (action?: NavigationAction) => {
      if (!isWizardActive) {
        completeExit(action);
        return;
      }

      const decision = getExitDecision();
      if (decision === "allow") {
        completeExit(action);
        return;
      }

      if (decision === "block") {
        return;
      }

      if (isExitAlertVisibleRef.current) {
        return;
      }

      isExitAlertVisibleRef.current = true;
      Alert.alert(EVENT_CREATION_EXIT_ALERT.title, EVENT_CREATION_EXIT_ALERT.message, [
        {
          text: EVENT_CREATION_EXIT_ALERT.stayLabel,
          style: "cancel",
          onPress: () => {
            isExitAlertVisibleRef.current = false;
          },
        },
        {
          text: EVENT_CREATION_EXIT_ALERT.leaveLabel,
          style: "destructive",
          onPress: () => {
            isExitAlertVisibleRef.current = false;
            completeExit(action);
          },
        },
      ]);
    },
    [completeExit, getExitDecision, isWizardActive],
  );

  useEffect(() => {
    if (!isWizardActive) {
      return;
    }

    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      const decision = getExitDecision();
      if (!shouldPreventNavigationRemoval(decision)) {
        return;
      }

      event.preventDefault();

      if (decision === "block") {
        return;
      }

      requestExit(event.data.action);
    });

    return unsubscribe;
  }, [getExitDecision, isWizardActive, navigation, requestExit]);

  const organizerAge = useMemo(
    () => (user?.privateProfile.birthDate ? calculateAgeFromBirthDate(user.privateProfile.birthDate) : null),
    [user?.privateProfile.birthDate],
  );

  const validationContext = useMemo(
    () => ({
      organizerAge,
    }),
    [organizerAge],
  );

  const stepState = useMemo(
    () => resolveEventCreationStepState(draft, validationContext, currentStep),
    [currentStep, draft, validationContext],
  );

  const loadActiveEventCheck = useCallback(async () => {
    setActiveEventCheck({ status: "loading" });
    try {
      const status = await getOrganizerStatus();
      setActiveEventCheck({
        status: "ready",
        hasActiveEvent: Boolean(status.hasActiveEvent),
        activeEventTitle: status.activeEventTitle ?? null,
      });
    } catch {
      setActiveEventCheck({
        status: "error",
        message: resolveActiveEventCheckFailureMessage(),
      });
    }
  }, []);

  useEffect(() => {
    void loadActiveEventCheck();
  }, [loadActiveEventCheck]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [currentStep]);

  const clearFieldError = (key: keyof EventCreationFieldErrors) => {
    setFieldErrors((previous) => {
      if (!previous[key]) {
        return previous;
      }
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const handleExit = () => {
    requestExit();
  };

  const goToStep = (step: EventCreationStep) => {
    setCurrentStep(step);
    setFieldErrors({});
    setSubmitError(null);
  };

  const handleNext = () => {
    const errors = validateEventCreationStep(currentStep, draft, validationContext);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (currentStep < 5) {
      goToStep((currentStep + 1) as EventCreationStep);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      handleExit();
      return;
    }

    goToStep((currentStep - 1) as EventCreationStep);
  };

  const handleSubmit = async () => {
    if (!isOrganizerApproved || activeEventCheck.status !== "ready" || activeEventCheck.hasActiveEvent) {
      return;
    }

    const errors = validateCompleteEventDraft(draft, validationContext);
    setFieldErrors(errors);
    setSubmitError(null);

    if (Object.keys(errors).length > 0) {
      const firstInvalidStep = resolveFirstInvalidStep(draft, validationContext);
      if (firstInvalidStep) {
        setCurrentStep(firstInvalidStep);
      }
      return;
    }

    const capacity = parseCapacityInput(draft.capacityInput);
    if (capacity == null) {
      setCurrentStep(3);
      setFieldErrors({
        capacity: resolveCapacityValidationError(draft.capacityInput) ?? "Geçerli bir kapasite gir (pozitif tam sayı).",
      });
      return;
    }

    const payloadResult = buildCreateEventPayload(draft, capacity);
    if (!payloadResult.ok) {
      if (payloadResult.reason === "timezone") {
        setCurrentStep(2);
        setFieldErrors({ timezone: EVENT_TIMEZONE_INVALID_MESSAGE });
        return;
      }

      const firstInvalidStep = resolveFirstInvalidStep(draft, validationContext) ?? 2;
      setCurrentStep(firstInvalidStep);
      return;
    }

    setIsSubmitting(true);

    try {
      let coverImageUrl: string | undefined;
      if (draft.coverUri) {
        coverImageUrl = await uploadImage(draft.coverUri, { folder: "events/covers" });
      }

      await createEvent({
        ...payloadResult.payload,
        ...(coverImageUrl ? { coverImageUrl } : {}),
      });

      allowNavigationRef.current = true;

      Alert.alert("Başarılı", "Etkinliğin incelenmek üzere gönderildi.", [
        { text: "Tamam", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Etkinlik oluşturulamadı.";
      if (message.toLowerCase().includes("active event") || message.toLowerCase().includes("409")) {
        setActiveEventCheck({
          status: "ready",
          hasActiveEvent: true,
          activeEventTitle: activeEventCheck.status === "ready" ? activeEventCheck.activeEventTitle : null,
        });
        setSubmitError("Mevcut etkinlik limitine ulaştın. Bitmeden yeni etkinlik oluşturamazsın.");
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <ScreenBackHeader onBack={handleExit} title="Etkinlik Oluştur" />
      <AppText style={styles.stepCounter} variant="caption">
        Adım {currentStep} / 5
      </AppText>
      <EventCreationStepper completedSteps={stepState.completedSteps} currentStep={currentStep} />
      <AppText style={styles.stepTitle} variant="sectionTitle">
        {EVENT_CREATION_STEP_TITLES[currentStep]}
      </AppText>
    </View>
  );

  if (activeEventCheck.status === "loading") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          {renderHeader()}
          <Card style={styles.stateCard}>
            <Loader label="Kontrol ediliyor..." />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!isOrganizerApproved) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Oluştur" />
          <Card style={styles.stateCard}>
            <AppText variant="body">Etkinlik oluşturmak için onaylı organizatör olmalısın.</AppText>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (activeEventCheck.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Oluştur" />
          <Card style={styles.stateCard}>
            <AppText variant="body">{activeEventCheck.message}</AppText>
            <Pressable onPress={() => void loadActiveEventCheck()}>
              <AppText style={styles.retryLink} variant="label">
                Tekrar dene
              </AppText>
            </Pressable>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (activeEventCheck.hasActiveEvent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Oluştur" />
          <Card style={styles.blockCard}>
            <AppText variant="sectionTitle">Mevcut etkinlik limitine ulaştın</AppText>
            <AppText variant="bodyMuted">
              {activeEventCheck.activeEventTitle
                ? `"${activeEventCheck.activeEventTitle}" etkinliğin devam ederken yeni etkinlik oluşturamazsın.`
                : "Devam eden veya onay bekleyen bir etkinliğin varken yeni etkinlik oluşturamazsın."}
            </AppText>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={styles.flex}
      >
        <View style={styles.pagePadding}>{renderHeader()}</View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 ? (
            <BasicsStep
              draft={draft}
              errors={fieldErrors}
              onChange={patchDraft}
              onClearError={clearFieldError}
            />
          ) : null}

          {currentStep === 2 ? (
            <DateLocationStep
              draft={draft}
              errors={fieldErrors}
              onChange={patchDraft}
              onClearError={clearFieldError}
              onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
              onOpenTimezonePicker={() => setIsTimezonePickerOpen(true)}
              onSetStartsAt={setStartsAt}
            />
          ) : null}

          {currentStep === 3 ? (
            <ParticipationStep
              draft={draft}
              errors={fieldErrors}
              onChange={patchDraft}
              onClearError={clearFieldError}
              organizerAge={organizerAge}
            />
          ) : null}

          {currentStep === 4 ? (
            <TicketsStep
              draft={draft}
              errors={fieldErrors}
              onChange={patchDraft}
              onClearError={clearFieldError}
            />
          ) : null}

          {currentStep === 5 ? (
            <PreviewStep draft={draft} onEditStep={goToStep} submitError={submitError} />
          ) : null}
        </ScrollView>

        <EventCreationBottomBar
          canProceed={currentStep === 5 ? true : stepState.canProceed}
          currentStep={currentStep}
          isSubmitting={isSubmitting}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={() => void handleSubmit()}
        />
      </KeyboardAvoidingView>

      <EventTimezonePickerModal
        onClose={() => setIsTimezonePickerOpen(false)}
        onSelect={(timezone) => {
          patchDraft({ timezone });
          clearFieldError("timezone");
          clearFieldError("startsAt");
          clearFieldError("endsAt");
        }}
        selectedTimezone={draft.timezone}
        visible={isTimezonePickerOpen}
      />

      <EventLocationPickerModal
        city={draft.city}
        countryCode={draft.countryCode}
        onClose={() => setIsLocationPickerOpen(false)}
        onConfirm={(nextCountryCode, nextCity) => {
          patchDraft({ countryCode: nextCountryCode, city: nextCity });
          clearFieldError("location");
        }}
        visible={isLocationPickerOpen}
      />
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
    paddingHorizontal: theme.spacing.lg,
  },
  headerBlock: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  stepCounter: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  stepTitle: {
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  stateCard: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  blockCard: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  retryLink: {
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
});
