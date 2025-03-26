"use client";
export const KeycloakOAuthLoginButton: React.FC = () => (
  <a href="/api/users/oauth/keycloak">
    <button
      className="btn btn--icon-style-without-border btn--size-large btn--withoutPopup btn--style-primary btn--withoutPopup"
      style={{ width: "100%" }}
    >
      Continue With Keycloak
    </button>
  </a>
);
