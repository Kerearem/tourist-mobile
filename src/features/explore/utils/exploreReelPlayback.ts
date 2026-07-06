export type ExploreReelPlaybackContext = {
  isScreenFocused: boolean;
  isAppActive: boolean;
  activeVisiblePostKey: string | null;
  postKey: string;
  isSearchOpen: boolean;
  isSearchProfileOpen: boolean;
  isCommentsOpen: boolean;
  isShareOpen: boolean;
  isMoreMenuOpen: boolean;
  isContentReportOpen: boolean;
  isPostReportedHidden: boolean;
  isProfileMenuOpen: boolean;
  isProfileReportOpen: boolean;
};

export function getExplorePostPlaybackKey(post: { type: string; id: string }): string {
  return `${post.type}:${post.id}`;
}

export function shouldExploreReelPlaybackActive(context: ExploreReelPlaybackContext): boolean {
  if (!context.isScreenFocused) {
    return false;
  }

  if (!context.isAppActive) {
    return false;
  }

  if (context.activeVisiblePostKey !== context.postKey) {
    return false;
  }

  if (context.isSearchOpen) {
    return false;
  }

  if (context.isSearchProfileOpen) {
    return false;
  }

  if (context.isCommentsOpen) {
    return false;
  }

  if (context.isShareOpen) {
    return false;
  }

  if (context.isMoreMenuOpen) {
    return false;
  }

  if (context.isContentReportOpen) {
    return false;
  }

  if (context.isPostReportedHidden) {
    return false;
  }

  if (context.isProfileMenuOpen) {
    return false;
  }

  if (context.isProfileReportOpen) {
    return false;
  }

  return true;
}
