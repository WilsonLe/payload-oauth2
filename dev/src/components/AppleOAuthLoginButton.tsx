"use client";
export const AppleOAuthLoginButton: React.FC = () => (
  <a href="/api/users/oauth/apple">
    <button
      className="btn btn--icon-style-without-border btn--size-large btn--withoutPopup btn--style-primary btn--withoutPopup"
      style={{ width: "100%" }}
    >
      Continue With Apple
    </button>
  </a>
);
