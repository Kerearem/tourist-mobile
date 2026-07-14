import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { deleteOrganizerReel } from "../services/reels.service";
import {
  deleteEventMoment,
  pinProfileContent,
  unpinProfileContent,
  updateMomentCaption,
  updateReelCaption,
  updateSnapCaption,
} from "../services/profileContentManagement.service";
import { deleteSnap } from "../../snaps/services/snaps.service";
import {
  PROFILE_CONTENT_CAPTION_LIMITS,
  PROFILE_PIN_LIMIT_MESSAGE_TR,
  applyProfileContentPinState,
  getOwnContentManagementCapabilities,
  sortProfileContentItems,
  type OwnContentManagementTarget,
  type ProfileContentPinMeta,
  type ProfileContentType,
} from "../utils/profileContentManagement";
import { EditContentCaptionModal } from "../components/EditContentCaptionModal";
import { OwnContentManagementSheet } from "../components/OwnContentManagementSheet";

type UseOwnContentManagementOptions<T extends { id: string; createdAt: string; caption?: string | null } & ProfileContentPinMeta> = {
  context: "profile" | "event-album";
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  onAllDeleted?: () => void;
  onItemDeleted?: (contentId: string) => void;
};

export function useOwnContentManagement<T extends { id: string; createdAt: string } & ProfileContentPinMeta>({
  context,
  items,
  setItems,
  onAllDeleted,
  onItemDeleted,
}: UseOwnContentManagementOptions<T>) {
  const [sheetTarget, setSheetTarget] = useState<OwnContentManagementTarget | null>(null);
  const [editTarget, setEditTarget] = useState<OwnContentManagementTarget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const capabilities = useMemo(
    () =>
      sheetTarget
        ? getOwnContentManagementCapabilities(sheetTarget.type, context)
        : { canEdit: false, canDelete: false, canPin: false },
    [context, sheetTarget],
  );

  const openManagement = useCallback((target: OwnContentManagementTarget) => {
    setSheetTarget(target);
  }, []);

  const closeManagement = useCallback(() => {
    setSheetTarget(null);
  }, []);

  const closeEdit = useCallback(() => {
    setEditTarget(null);
  }, []);

  const applyPinChange = useCallback(
    (contentId: string, isPinned: boolean, pinnedAt?: string) => {
      setItems((current) =>
        sortProfileContentItems(
          current.map((item) =>
            item.id === contentId ? applyProfileContentPinState(item, isPinned, pinnedAt) : item,
          ),
        ),
      );
    },
    [setItems],
  );

  const removeItem = useCallback(
    (contentId: string) => {
      setItems((current) => {
        const next = current.filter((item) => item.id !== contentId);
        if (next.length === 0) {
          onAllDeleted?.();
        }
        return next;
      });
    },
    [onAllDeleted, setItems],
  );

  const handleDelete = useCallback(() => {
    if (!sheetTarget) {
      return;
    }

    const target = sheetTarget;
    closeManagement();

    Alert.alert("Gönderiyi sil", "Bu gönderiyi silmek istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setIsSubmitting(true);
            try {
              if (target.type === "SNAP") {
                await deleteSnap(target.id);
              } else if (target.type === "REEL") {
                await deleteOrganizerReel(target.id);
              } else if (target.eventId) {
                await deleteEventMoment(target.eventId, target.id);
              }

              removeItem(target.id);
              onItemDeleted?.(target.id);
            } catch (error) {
              Alert.alert(
                "Silinemedi",
                error instanceof Error ? error.message : "Gönderi silinemedi.",
              );
            } finally {
              setIsSubmitting(false);
            }
          })();
        },
      },
    ]);
  }, [closeManagement, onItemDeleted, removeItem, sheetTarget]);

  const handleEditPress = useCallback(() => {
    if (!sheetTarget) {
      return;
    }

    const target = sheetTarget;
    closeManagement();
    setEditTarget(target);
  }, [closeManagement, sheetTarget]);

  const handleSaveCaption = useCallback(
    (caption: string) => {
      if (!editTarget) {
        return;
      }

      void (async () => {
        setIsSubmitting(true);
        try {
          let nextCaption: string | null = caption || null;

          if (editTarget.type === "SNAP") {
            const result = await updateSnapCaption(editTarget.id, caption);
            nextCaption = result.caption;
          } else if (editTarget.type === "REEL") {
            const result = await updateReelCaption(editTarget.id, caption);
            nextCaption = result.caption;
          } else if (editTarget.eventId) {
            const result = await updateMomentCaption(editTarget.eventId, editTarget.id, caption);
            nextCaption = result.caption;
          }

          setItems((current) =>
            current.map((item) =>
              item.id === editTarget.id ? { ...item, caption: nextCaption } : item,
            ),
          );
          setEditTarget(null);
        } catch (error) {
          Alert.alert(
            "Kaydedilemedi",
            error instanceof Error ? error.message : "Gönderi düzenlenemedi.",
          );
        } finally {
          setIsSubmitting(false);
        }
      })();
    },
    [editTarget, setItems],
  );

  const handlePin = useCallback(() => {
    if (!sheetTarget) {
      return;
    }

    const target = sheetTarget;
    closeManagement();

    void (async () => {
      setIsSubmitting(true);
      try {
        const result = await pinProfileContent(target.type, target.id);
        applyPinChange(result.targetId, true, result.pinnedAt);
      } catch (error) {
        Alert.alert(
          "Sabitleme başarısız",
          error instanceof Error ? error.message : PROFILE_PIN_LIMIT_MESSAGE_TR,
        );
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [applyPinChange, closeManagement, sheetTarget]);

  const handleUnpin = useCallback(() => {
    if (!sheetTarget) {
      return;
    }

    const target = sheetTarget;
    closeManagement();

    void (async () => {
      setIsSubmitting(true);
      try {
        await unpinProfileContent(target.type, target.id);
        applyPinChange(target.id, false);
      } catch (error) {
        Alert.alert(
          "Sabitleme kaldırılamadı",
          error instanceof Error ? error.message : "Sabitleme kaldırılamadı.",
        );
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [applyPinChange, closeManagement, sheetTarget]);

  const managementUi = (
    <>
      <OwnContentManagementSheet
        canDelete={capabilities.canDelete}
        canEdit={capabilities.canEdit}
        canPin={capabilities.canPin}
        isPinned={sheetTarget?.isPinned}
        onClose={closeManagement}
        onDeletePress={handleDelete}
        onEditPress={handleEditPress}
        onPinPress={handlePin}
        onUnpinPress={handleUnpin}
        visible={sheetTarget != null}
      />
      <EditContentCaptionModal
        initialCaption={editTarget?.caption ?? ""}
        isSubmitting={isSubmitting}
        maxLength={
          editTarget ? PROFILE_CONTENT_CAPTION_LIMITS[editTarget.type as ProfileContentType] : 500
        }
        onClose={closeEdit}
        onSave={handleSaveCaption}
        visible={editTarget != null}
      />
    </>
  );

  return {
    isSubmitting,
    openManagement,
    managementUi,
    items,
  };
}
