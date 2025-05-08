"use client";

export const MicrosoftEntraIdOAuthLoginButton: React.FC = () => (
  <a href="/api/users/oauth/microsoft-entra-id">
    <button
      className="btn btn--icon-style-without-border btn--size-large btn--withoutPopup btn--style-primary btn--withoutPopup"
      style={{ width: "100%" }}
    >
      Continue With Microsoft Entra Id
    </button>
  </a>
);
