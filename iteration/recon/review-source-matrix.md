# L-A · 国际评价平台条款横评（裁决输入 · 本文件不含裁决）

- **范围**：国际平台。日本本地平台 = **L-B**、中文平台 = **L-C**，本文件不含，避免三线重复。
- **抓取**：2026-09-30，本机 `curl`（本机 `web_fetch` 被沙箱拦，报 "resolves to a non-public IP address"）。原始落盘：`iteration/recon/_fetch-intl/`（首次抓取用的共享临时目录 `iteration/recon/_fetch/` 已被其他并行线清理，故按同一 URL 重抓后落在此线自有目录）。
- **引文口径**：HTML / Markdown 的纯文本渲染——去标签与标记、实体解码、空白折叠、标点前与弯引号内空格归一（与 `docs/handOff/evidence/CLAUSES-verbatim.md` 同口径）；`[…]` 表示省略，**未改写任何词**。URL 逐条给出。
- **机械自查**：`pwsh -NoProfile -File iteration/recon/_fetch-intl/verify-quotes.ps1` 对本文件每条引文按 25 字符滑动窗口比对落盘字节 → **635 个窗口全部命中，0 失败**（2026-09-30 实测）。
- **两个必须分开的问题**：①*能否向用户展示* ②*能否**存储**并**再分发**（离线 + 打印）*。本项目要的是②，且必须**永久**。下表"存储 / 再分发"两列一律指②。
- **本文件不给"建议选哪个"**：裁决由 Lead 汇总三线后做。

## 1. 结论表

| 源 | 可否存储 | 可否再分发（打印+离线） | 缓存时限 | 署名/回链 | 商用 | 结论 |
|---|---|---|---|---|---|---|
| **Google Places API**（legacy + new） | ❌ 明文禁止 | ❌ | 仅经纬度可缓存 **30 个连续日历日** | 必须按文档署名 | 需付费档，但许可本身不解决存储 | **不可用** |
| **Yelp Fusion / Places API** | ❌ >24 小时即禁止 | ❌ | **24 小时** | 必须保留超链接、品牌星标、直链原页 | 商用需**书面同意** | **不可用** |
| **Foursquare Places API**（PAYG/Sandbox） | ❌ "no caching permitted" | ❌ | 仅 `fsq_place_id` / Photo ID 无限；其余 **0** | 必须 "Powered by Foursquare" | 另行付费档；许可禁止派生作品 | **不可用** |
| **Foursquare Places API**（Enterprise） | ⚠️ 仅 24 小时**本地设备** | ❌（禁服务器缓存） | 其余属性 **24 小时** | 同上 | 同上 | **不可用** |
| **Foursquare OS Places**（开放数据集） | ✅ Apache-2.0 | ✅（可商用、可分发） | 无（是数据集，非 API） | 保留许可与声明 | ✅ | **可用（仅地点属性；不含评论文本）** |
| **TripAdvisor Content API（legacy）/ Terra** | ❌ 除 Location ID 外一律禁止 | ❌ | **仅 Location ID 可缓存** | 强制多处回链（"Read more…"等） | 一次性 1,000 计费实体免费，其后计费 | **不可用**（且 legacy 已弃用） |
| **HERE Places**（Location Services） | ❌ 不得提供给他人；日本内容 24h | ❌ | 一般 **30 天**；**日本内容 24 小时** | 不得移除 HERE 标记 | 需订阅；禁 AI/ML 用途 | **不可用** |
| **Wikivoyage / Wikimedia 文本**（CC BY-SA 4.0） | ✅ | ✅（含打印、含商用） | 无 | 必须署名 + 许可链接 + **ShareAlike** | ✅（"even commercially"） | **可用（说明性文字；不是用户评论）** |
| **TomTom Places/Search API** | — | — | — | — | — | **未取到**（见缺口 1） |

> 表内"结论"只回答**该源能否承担"永久离线/打印的评论内容"**这一个用途。OS Places 与 Wikivoyage 标"可用"是因为它们在**各自用途**上确实授权存储再分发，而两者都**不提供用户评论文本**——**不能**用它们去满足"5 条近期用户评论"。

## 2. 逐源原文（URL + 逐字引文）

### 2.1 Google — 不可用
`https://cloud.google.com/maps-platform/terms`（General ToS §3.2.3）、`https://cloud.google.com/maps-platform/terms/maps-service-terms`（Maps Service Specific Terms §14）
- > 3.2.3 Restrictions Against Misusing the Services . (a) No Scraping . Customer will not export, extract, or otherwise scrape Google Maps Content for use outside the Services. For example, Customer will not: (i) pre-fetch, index, store, reshare, or rehost Google Maps Content outside the services; […] (iii) copy and save business names, addresses, or user reviews; […]
- > (b) No Caching . Customer will not cache Google Maps Content except as expressly permitted under the Maps Service Specific Terms.
- > 14.2 No use with a non-Google map . Customer must not use Google Maps Content from the Places API in conjunction with a non-Google map.
- > 14.3 Caching. Customer may temporarily cache latitude and longitude values from the Places API for up to 30 consecutive calendar days, after which Customer must delete the cached latitude and longitude values.
交叉核对：§14.2 / §14.3 的字句在既有落盘字节 `docs/handOff/evidence/google-maps-service-terms.html` 中逐条命中（"No use with a non-Google map" 18 次、"30 consecutive calendar days" 38 次）。**杀死它的是 §3.2.3(a)(iii) 的 "copy and save … user reviews"**——评论文本连"保存"都不允许，与打印/离线无关。

### 2.2 Yelp — 不可用
`https://terms.yelp.com/developers/api_terms/20260922_en_us/`（API Agreement）、`https://terms.yelp.com/developers/display_requirements/`（Display Requirements）
- > a. cache, record, pre-fetch, or otherwise store any portion of the Yelp Content for a period longer than twenty-four (24) hours from receipt of the Yelp Content, or attempt or provide a means to execute any scraping or “bulk download” operations, with the exception of using the Yelp Content to perform non-commercial analysis (as further explained below) or storing Yelp business IDs which you may use solely for back-end matching purposes;
- > The API is made available by Yelp Inc. ( “Yelp” ) to enable you to access and present Yelp Content to on your consumer-facing content distribution platform (i.e. non-commercial uses, as defined below) […]
- > You agree that you will remove from display and destroy any Yelp Content within twenty-four (24) hours upon email or other written request from Yelp.
- > d. create or disclose metrics about, or perform any analysis of the API, or use Yelp Content for any commercial purpose without the express written consent of Yelp (i.e. don’t sell any Yelp data or content whatsoever);
- > e. modify or remove the hyperlink contained within any Yelp Content that is provided in the API;
- > Store data longer than 24 hours. ／ > Link directly to the corresponding Yelp pages whenever you display star ratings, review excerpts, and review counts from Yelp. ／ > Blend star rating content from Yelp with rating content from other sources. This means no aggregated “overall ratings” which utilize multiple sources of ratings. Yelp content must stand alone. ／ > Exceptions are on a case-by-case basis. Please write to api@yelp.com to obtain Yelp’s explicit approval for your specific use case.
（以上四句均出自 Display Requirements 页；我们**未申请**、**未取得**书面批准 → 按公开默认条款记"不可用"，不推断例外会被批。）

### 2.3 Foursquare Places API — 不可用
`https://docs.foursquare.com/fsq-developers-places/reference/usage-guidelines.md`、`https://foursquare.com/legal/terms/apilicenseagreement/`（页面正文标题为 "Places API - PAYG"）
- > * **fsq\_place\_id**: unlimited caching (solely to improve the performance of your application). ／ > * **Photo IDs**: unlimited caching
- > All Other Attributes: ／ > * **Enterprise Customers**: 24-hour local-device caching only (no server-based caching is permitted); or ／ > * **Pay as You Go & Sandbox Customers**: no caching permitted.
- > …Foursquare grants you a limited, non-exclusive, revocable, non-sublicensable, non-transferable license, without rights to create any derivative works, to access and use the Places API to (a) develop, implement and integrate with application(s) […] (c) use, reproduce, distribute, transmit, display and perform Places Data as part of Your Service; and (d) create external reports, analyses and demos (“External Materials”) using Places Data, so long as: (i) you provide Foursquare with branded attribution […] (ii) no material portions of the Places Data are exposed to third parties […] and (iii) the External Materials are not competitive with Foursquare’s then-current products or services.
- > 2.2 – Visual Crediting. You must provide Foursquare with branded attribution (i.e., ‘Powered by Foursquare’) on any page or screen within Your Service where Places Data may appear.
- > 2.5.2 – Make Places Data available to third parties in bulk;
评论性文本落在 Tips 端点（`https://docs.foursquare.com/fsq-developers-places/reference/place-tips.md`：`# Get Place Tips` / `/places/{fsq_place_id}/tips`），属 "All Other Attributes" → PAYG **不得缓存**。注意：许可虽写了 "distribute … as part of Your Service"，但保留期规则独立生效且更严，**打印件所需的长期保留不被允许**。

### 2.4 Foursquare OS Places（开放数据集）— 可用（仅地点属性）
`https://huggingface.co/datasets/foursquare/fsq-os-places`（dataset card）、`https://www.apache.org/licenses/LICENSE-2.0.txt`、`https://docs.foursquare.com/data-products/docs/places-os-data-schema`
- > Foursquare OS Places is now a gated dataset on Hugging Face.
- Dataset card 声明的许可字段（Hugging Face dataset API `cardData.license`）：`["apache-2.0"]`
- > 2. Grant of Copyright License. […] perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work and such Derivative Works in Source or Object form.
- > 4. Redistribution. You may reproduce and distribute copies of the Work or Derivative Works thereof in any medium, with or without modifications, and in Source or Object form, provided that You meet the following conditions:
- > With Foursquare’s Open Source Places, you can access free data to accelerate geospatial innovation and insights. View the Places OS Data Schemas for a full list of available attributes.
**所依赖的句子**：Apache-2.0 §2/§4（上引）+ 该数据集声明的许可标识 `apache-2.0`。**边界**：其公开的 Places Dataset 列清单只列地点属性；全页 "review" 仅出现于 "A link to the POI’s review page in the PlaceMaker Tools application." ——**没有任何用户评论 / Tips 列**。即：**可用，但不满足"评论"这一需求**。

### 2.5 TripAdvisor Content API（legacy）与 Terra — 不可用
`https://tripadvisor-content-api.readme.io/reference/overview.md`、`https://docs.terra.tripadvisor.com/docs/caching-policy.md`、`…/linking-policy.md`、`…/api-master-terms.md`、`…/review-implementation-policy.md`、`…/usage-based-pricing.md`（前缀同 `https://docs.terra.tripadvisor.com/docs/`）
- > 🚧 This API is deprecated. The legacy Tripadvisor Content API is no longer being updated. Please migrate to Terra , our new and actively maintained API platform.
- > Except as explicitly provided in your contract with Tripadvisor, caching, copying, downloading, storing or indexing content is not permitted for any content, except that the Location ID attribute can be cached solely to improve the speed of your application.
- > A “Read more…” link beneath truncated reviews linking to the full review on Tripadvisor
- > 3.4.4. Other Restrictions - Customer shall not: (a) modify, edit, shorten, add to, transform, adapt, create derivative works of, reproduce, distribute or copy the TA Materials or Services, unless explicitly permitted by Tripadvisor under this Agreement, provided that Customer may truncate consecutive characters at the beginning or end of Licensed Content user reviews so long as Customer (i) makes clear to End Users that such user reviews are truncated, (ii) displays a link to the Tripadvisor Site where End Users can read the entire review, and (iii) does not truncate the Licensed Content user reviews shorter than 200 characters; […]
- > 3.4.5. During the Agreement Term, Customer will not license, collect or display content similar to the Licensed Content, including without limitation displaying or using the TA Materials on the Customer Application alongside or in conjunction with other user-generated content.
- > The review content should never appear directly in the source code of the loaded page, be it in HTML or JavaScript. ／ > The review content must be loaded via an external JavaScript call that is blocked in robots.txt so that Google cannot crawl the review text.
- > Discover includes a one-time free usage allowance where the **first 1,000 billable entities for your account are free**.
评论必须**运行时从外部 JS 拉取**且不得进 robots 索引——与"离线打印件"在结构上互斥；3.4.5 还禁止与其他用户生成内容并置。

### 2.6 HERE Places（Location Services / Platform Terms, September 2023）— 不可用
`https://legal.here.com/en-gb/terms/here-platform`（落定为 `…/here-platform-terms-september-2023`）
- > h) Provide Results and/or HERE Content to another person or entity;
- > j) Cache or store outside of the Platform any Results that include anything from the use of HERE Content or Location Services for more than 30 days, except HERE Positioning services which cannot be cached or stored outside the Platform for more than 24 hours, unless Results are used solely for your internal testing, evaluation, or record retention for audit and legal compliance purposes;
- > k) Cache or store any Results from HERE Content and Location Services for Japan (with the exception of Geocoding and Search as described in context of these services) for more than 24 hours, unless Results are generated using an Asset Subscription Plan or a Monthly Active User (MAU) HERE Navigate SDK Subscription Plan and are stored on a smartphone (or tablet that is diverting smartphone services), in which case Results can be cached or stored for a maximum of 30 days;
- > c) Modify HERE Content and/or Results;
- > l) Create any Results that contain unenhanced or unmodified HERE Content or scaling one Request to serve multiple End Users;
- > f) Use HERE Materials in connection with a machine learning or artificial intelligence (“AI”) system, including but not limited to, models used in connection with natural language processing, algorithm optimization and training […] generative AI, and data extrapolation;
- > 13.1 You may not remove or obfuscate any HERE Marks or copyright notices affixed to or included in HERE Materials or Results.
第一座城是京都 → **6.4(k) 专条把日本内容的 Results 压到 24 小时**；叠加 6.4(h)（不得提供给他人）与 6.4(c)（不得修改），永久打印不可能。

### 2.7 Wikivoyage / Wikimedia 文本（CC BY-SA 4.0）— 可用（说明性文字；不是用户评论）
`https://en.wikivoyage.org/wiki/Wikivoyage:Copyright`、`https://en.wikivoyage.org/wiki/Wikivoyage:How_to_re-use_Wikivoyage_guides`、`https://creativecommons.org/licenses/by-sa/4.0/`
- > This page in a nutshell: All written contributions to this project are automatically licensed under the CC BY-SA 4.0 License.
- > This can be done by simply providing a link back to the Wikivoyage page or, if you are making a printed guide, by providing a link in the hard copy. There is a permanent link to the current article version in the Tools menu of each page.
- > It can be photocopied thousands of times and passed around as flyers by itinerant backpackers. It can be put in Hollywood movies […] It can be used for commercial ventures, advertisements, or other purposes (with some restrictions) without your direct control.
- > Share — copy and redistribute the material in any medium or format for any purpose, even commercially.
- > Attribution — You must give appropriate credit , provide a link to the license, and indicate if changes were made .
- > ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license
**所依赖的句子**：上引 CC 授权页三条 + Wikivoyage 明确写下"**如果做的是打印攻略，在纸质件里给出链接即可**"满足署名。这使**打印/离线**这一条真的成立（而不是只允许展示）。义务 = 署名 + 许可链接 + **ShareAlike**。**边界**：内容属性是**旅行说明文**，不是"近期用户评论"。

### 2.8 TomTom Places/Search API — 未取到
`https://docs.tomtom.com/legal/terms-and-conditions` 返回 200 但为 **JS 壳**（纯文本正文 306 字符；全文 `cache` / `redistribut` 命中 **0**）；`…/terms-and-conditions/index.md`、`…/terms-and-conditions.md` 均 **404**；旧地址 `https://developer.tomtom.com/terms-and-conditions` 302 至同一壳。**未读到条款 → 无结论**（按硬约束记缺口，不据声誉推断）。

## 3. 缺口清单（显式声明，宁缺不猜）

1. **TomTom**：条款页为 JS 壳，正文与条款全文均未取到 → 记"未取到"，不判定。
2. **Google Places 价格/免费额度**：既有证据文件已记 `google-places-billing.html` 无 per-1,000 价格表 → 本文件 Google 行**不主张**任何价格或免费额度。
3. **Foursquare 免费档与限额数字**：只取到 "Pay as You Go & Sandbox" 这一**客户类别名称**，未取到限流/免费额度数值。
4. **Foursquare OS Places 的访问条件**：card 明示 "now a gated dataset" → 实际申请/接受条款流程与是否另有附加协议**未取到**；许可标识本身已核（apache-2.0）。
5. **HERE 免费档**：条款内仅见 "Base Plan" 字样一次，额度数字**未取到**。
6. **Wikivoyage 署名样例自相矛盾**：同页正文写 "CC BY-SA 4.0"，而样例署名串写 "Creative Commons Attribution-ShareAlike 3.0 licence" → 打印前必须定稿用哪一行；本文件**不做选择**。
7. **CC BY-SA 的 ShareAlike 边界**：把逐字片段编入打印攻略属"汇编"还是"改编"，**未取得法律意见**；本文件只记录许可原文，不主张任何一种解释。
8. **TripAdvisor 的合同可覆盖性**：Caching Policy 原文留有 "Except as explicitly provided in your contract with Tripadvisor" → 定制合同空间存在，但**未取到任何合同文本**，本文件只对**公开默认条款**下结论。
9. **"允许存储 + 打印再分发用户评论文本"的国际平台条款**：在本线所覆盖的源里**一条都没取到**。故原型要求"5 条近期用户评论"在**本线范围内没有可发布路径**——**这是事实汇总，不是裁决**，也不排除 L-B / L-C、自建评论或购买数据授权（`data-licensing@yelp.com`、Insights API 等**均未申请、未询价**）。
10. **本线明确未探的候选**（记缺口，未做任何推断）：Trustpilot、Expedia / Booking.com（需合作方协议）、Apple MapKit / Apple Places、Yandex、Microsoft Bing Maps、OpenTripMap、Geoapify。它们**不是"不可用"，是"未取到"**。
11. **无评论内容的相邻源**（避免重复劳动）：OpenStreetMap(ODbL)、Wikidata、Mapbox / Stadia / MapTiler 等**不提供用户评论文本**，属图层/地点线，不在本次横评内；其条款见 `docs/handOff/evidence/CLAUSES-verbatim.md`。
