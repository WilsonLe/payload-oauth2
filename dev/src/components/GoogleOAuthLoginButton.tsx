"use client";
export const GoogleOAuthLoginButton: React.FC = () => (
  <a href="/api/users/oauth/google">
    <button
      className="btn btn--icon-style-without-border btn--size-large btn--withoutPopup btn--style-primary btn--withoutPopup"
      style={{ width: "100%" }}
    >
      Continue With Google
    </button>
  </a>
);
