"use client";
export const ZitadelOAuthLoginButton: React.FC = () => (
  <a href="/api/users/oauth/zitadel">
    <button
      className="btn btn--icon-style-without-border btn--size-large btn--withoutPopup btn--style-primary btn--withoutPopup"
      style={{ width: "100%" }}
    >
      Continue With Zitadel
    </button>
  </a>
);
