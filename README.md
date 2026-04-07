
<div align="right">
  <details>
    <summary >🌐 Language</summary>
    <div>
      <div align="center">
        <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=en">English</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=zh-CN">简体中文</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=zh-TW">繁體中文</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=ja">日本語</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=ko">한국어</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=hi">हिन्दी</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=th">ไทย</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=fr">Français</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=de">Deutsch</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=es">Español</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=it">Italiano</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=ru">Русский</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=pt">Português</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=nl">Nederlands</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=pl">Polski</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=ar">العربية</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=fa">فارسی</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=tr">Türkçe</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=vi">Tiếng Việt</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=id">Bahasa Indonesia</a>
        | <a href="https://openaitx.github.io/view.html?user=WilsonLe&project=payload-oauth2&lang=as">অসমীয়া</
      </div>
    </div>
  </details>
</div>

# Payload OAuth2 Plugin

<a href="LICENSE">
  <img src="https://img.shields.io/badge/license-MIT-brightgreen.svg" alt="Software License" />
</a>
<a href="https://github.com/wilsonle/payload-oauth2/issues">
  <img src="https://img.shields.io/github/issues/wilsonle/payload-oauth2.svg" alt="Issues" />
</a>
<a href="https://npmjs.org/package/payload-oauth2">
  <img src="https://img.shields.io/npm/v/payload-oauth2.svg?style=flat-squar" alt="NPM" />
</a>

# Features

- ✅ Compatible with Payload v3
- 🔐 Configures OAuth2 with any providers
- ✨ Zero dependencies
- ⚙ Highly customizable

# Integrations

Technically this plugin should work with all generic OAuth2 providers. Here are the list of providers that have been tested:

| Provider | Status                                                                                                                                                                                                      | Example                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Google   | [![Test Google OAuth](https://github.com/WilsonLe/payload-oauth2/actions/workflows/test-google-oauth.yml/badge.svg)](https://github.com/WilsonLe/payload-oauth2/actions/workflows/test-google-oauth.yml)    | [Config](./examples/google.ts)  |
| Zitadel  | [![Test Zitadel OAuth](https://github.com/WilsonLe/payload-oauth2/actions/workflows/test-zitadel-oauth.yml/badge.svg)](https://github.com/WilsonLe/payload-oauth2/actions/workflows/test-zitadel-oauth.yml) | [Config](./examples/zitadel.ts) |
| Apple    | Test not implemented                                                                                                                                                                                        | [Config](./examples/apple.ts)   |

# Installation

```
npm install payload-oauth2
yarn install payload-oauth2
pnpm install payload-oauth2
```

If you are feeling adventurous and want to manage the plugin yourself, you can copy the `src` directory into your payload projects.

# Contributing

Contributions and feedback are very welcome.

To get it running:

1. Clone the project.
2. `pnpm install`
3. `pnpm dev`

# License

The MIT License (MIT). Please see [License File](LICENSE) for more information.

# Credits

This package was inspired by [Payload Plugin OAuth](https://github.com/thgh/payload-plugin-oauth).
