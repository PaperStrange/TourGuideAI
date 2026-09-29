---
updatedAt: 2026-02-12T12:15:37.000Z
agentTools:
  projectIndex: https://docs.foursquare.com/fsq-developers-places/llms.txt
---

# Visual Crediting Policy

## Visual Credit

You can visually credit Foursquare by downloading our [logos](https://developer.foursquare.com/assets/PoweredByFSQ21.zip) and hosting on your CDN.

Here is an example of crediting Foursquare visually.

![](https://files.readme.io/2d515fd-Screen_Shot_2021-10-25_at_3.27.17_PM.png "Screen Shot 2021-10-25 at 3.27.17 PM.png")

## Linking to Us - Basic Data

Give your users the opportunity to learn more about the venues they see in your app. To do this, provide links back to corresponding Foursquare venue pages whenever you display any basic data (name, location, and category) retrieved from our venues database. Common approaches to this include:

* Linking the venue name directly
* Creating your own place detail page and linking that back to us
* Having some other dedicated “More Details” link

Use the sample link below as a reference for how to format your URLs:

```
<https://foursquare.com/v/john-f-kennedy-international-airport-jfk/43a52546f964a520532c1fe3?ref=PROEJCT_ID`>
```

This is a standard web link that degrades nicely to a mobile view, but we also encourage mobile clients to consider using a direct link to the venue detail page in the Foursquare native app. You can find the base URL in the canonicalUrl field in a venue details response, or you could also stitch a URL together with `<http://foursquare.com/v/`> + `venue_id`

Make sure to supply the `ref` parameter whose value is your app's `PROJECT_ID` so that we can confirm your app is attributing properly. Don't set `rel="nofollow"` on your links back to Foursquare.

If it absolutely doesn’t make sense to provide in links to Foursquare in your app's UI, you may provide Visual Attribution (see below) in lieu of linking. We expect most apps to be able to support linking.

## Beyond Basic Data

If you display any non-basic venue data such as tips or photos, you must both link back to the corresponding venue page and credit Foursquare visually as described above.

## Search Results

If you are displaying a list of venues as part of search results, you do not need to link to us on that screen. Instead, credit Foursquare visually as described above.

In certain conditions, other terms apply.