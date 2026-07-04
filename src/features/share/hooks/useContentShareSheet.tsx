import { useCallback, useState } from "react";

import { ContentShareSheet } from "../components/ContentShareSheet";
import type { ContentSharePayload } from "../types/contentShare";

export function useContentShareSheet() {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<ContentSharePayload | null>(null);

  const openShare = useCallback((next: ContentSharePayload) => {
    setPayload(next);
    setVisible(true);
  }, []);

  const closeShare = useCallback(() => {
    setVisible(false);
    setPayload(null);
  }, []);

  const contentShareSheet = (
    <ContentShareSheet onClose={closeShare} payload={payload} visible={visible} />
  );

  return { openShare, closeShare, contentShareSheet };
}
