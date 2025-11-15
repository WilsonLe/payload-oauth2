import Link from "next/link";

const Page = () => {
  return (
    <article className={["container"].filter(Boolean).join(" ")}>
      <h1>
        <span className="rainbow">Payload Oauth2 Plugin</span>
      </h1>
      <p>Features</p>
      <ul>
        <li>✅ Compatible with Payload v3</li>
        <li>🔐 Configures OAuth2 with any providers</li>
        <li>✨ Zero dependencies</li>
        <li>⚙ Highly customizable</li>
      </ul>
      <p>
        <strong>
          You can check some <Link href="/admin">SSO examples here</Link>. Make
          sure to configure the OAuth2 plugin environment variables.
        </strong>
      </p>
      <small>
        <a href="https://github.com/payloadcms/payload" target="_blank">
          https://github.com/payloadcms/payload
        </a>{" "}
      </small>
    </article>
  );
};

export default Page;
