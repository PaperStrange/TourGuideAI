---
updatedAt: 2025-10-09T20:07:45.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Review Implementation Policy

The review content should never appear directly in the source code of the loaded page, be it in HTML or JavaScript. A violation of this policy can lead to a termination of the licensing agreement and we reserve the right to conduct periodic and spontaneous audits of how our reviews were integrated on your site.

## Correct implementation

The review content must be loaded via an external JavaScript call that is blocked in robots.txt so that Google cannot crawl the review text.

### Implement reviews by blocking the specific ajax call that retrieves the reviews.

```html
<html>
  <head>
    <script>
      var review_content = $.ajax(“https://api.abc.com/getReviewContentForHotel/123/”);
                                  $(“review”).html(review_content);
    </script>
  </head>
 <body>
   <div id=”review”></div>
  </body>
</html>
```

<br />

Robots.txt in the root directory for <https://api.abc.com>

User-Agent: \*

Disallow: /getReviewContentForHotel

### Implement reviews by blocking all the JavaScript related to loading the reviews.

```html
<html>
  <head>
    <script src="/everything_to_do_with_loading_reviews/load_reviews.js"></script>
  </head>
  <body>
    <div id=”review”></div>
  </body>
</html>
```

Robots.txt in the root directory for <https://www.abc.com>

User-Agent: \*

Disallow: /everything\_to\_do\_with\_loading\_reviews

## Invalid implementation

Review text placed directly in body section of the HTML code

```html
<html>
  <head>
  </head>
  <body>
    <div>”I had a great time at this hotel”</div>
  </body>
</html>
```

JavaScript directly in the page source

```html
<html>
  <head>
    <script>
      var review_content = ”I had a great time at this hotel”;
      $(“review”).html(review_content);
    </script>
  </head>
  <body>
    <div id=”review”></div>
  </body>
</html>
```