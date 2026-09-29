---
updatedAt: 2026-02-12T12:15:36.000Z
agentTools:
  projectIndex: https://docs.foursquare.com/fsq-developers-places/llms.txt
---

# Usage Guidelines

Foursquare has long partnered with the developer community, providing access to our API since 2009. In order for us to continue to serve more than 125,0000 developers and companies, we ask that you help us maintain our platform, and follow the rules listed below.

**Please note:** We reserve the right to terminate access to the Places API if you violate these rules or any of the terms listed in our [Platform & Acceptable Use Policy](https://foursquare.com/legal/enterprise/places-api/aup/), our [Privacy Policies](https://foursquare.com/privacy/policies/), or the agreement or subscription you have with Foursquare.

As used herein, an "Enterprise Customer" means only those customers with a duly executed agreement that expressly provides 'enterprise access' to the Places API is permitted. All other customers shall be subject to the 'Pay as You Go & Sandbox' terms below.

## Data Retention

We understand that caching Foursquare data may increase the speed of your application. However, you must abide by the following rules around retaining data from the Places API:

* **fsq\_place\_id**: unlimited caching (solely to improve the performance of your application).
* **Photo IDs**: unlimited caching

All Other Attributes:

* **Enterprise Customers**: 24-hour local-device caching only (no server-based caching is permitted); or
* **Pay as You Go & Sandbox Customers**: no caching permitted.

## Your Privacy Policy

If your application accesses Foursquare user data, you must publish a privacy policy that complies with applicable law. Please be explicit in your privacy policy on how you use, store, and disclose user information.

For instance, if your app displays your users’ current location or contact information on a public page, they should know this before they authenticate and agree to use your app.

## Visual Crediting Policy

If your application uses our Places API, you must credit Foursquare as the source of your data through either visual credit (i.e., buttons, our developer logo, etc.) or contextual credit (i.e., woven into copy, etc.).

[View Visual Crediting Policy](https://docs.foursquare.com/fsq-developers-places/docs/visual-crediting-policy)<br />[View Trademark Guidelines](https://foursquare.com/legal/api/trademarkusage)