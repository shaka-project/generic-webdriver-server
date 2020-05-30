# Chromecast Receiver Deployment

This doc will explain how to deploy your own copy of the Chromecast receiver
app,  If you're curious why we have a receiver app, see
[how-it-works.md](how-it-works.md) for details.

Deploying your own copy of the Chromecast receiver would allow you to:

  1. Make changes to the receiver app that affect your clients
  2. Not depend on github.io being up or accessible from your network

Unless you need one of these things, we recommend using the default receiver
app ID, which points to a copy served by github.io.


## Deploying the receiver app to a server

The receiver application is a single HTML file with no local dependencies.  All
`<script>` and `<style>` tags are inline, except for the Cast SDK, which is
loaded from Google's CDN as recommended by Google.

You can host it almost anywhere as static HTML content, but it **must** be
served over HTTPS.


## Registering a Cast developer account

*(Instructions last checked 2020-05-29)*

If you don't have a Cast developer account, you will need one to register your
receiver app.  Please note that the Cast registration docs point out:

> If you work for an organization, register using a generic team email address
> rather than a personal or individual email address. **The email address for a
> Google Cast Developer Account cannot be changed once the account is
> created.** Make sure you are signed into the correct email address before
> continuing.

1. Visit https://cast.google.com/publish/
2. Sign in with a Google account
3. Agree to the terms of service
4. Pay the registration fee ($5 USD, non-refundable)
5. Wait up to 48 hours for your account registration to be processed

Source: https://developers.google.com/cast/docs/registration


## Registering a Cast receiver app

*(Instructions last checked 2020-05-29)*

1. Visit https://cast.google.com/publish/
2. Click "Add New Application"
3. Click "Custom Receiver"
4. Give the receiver a name, like "Chromecast WebDriver Receiver"
5. Enter the URL for your deployed copy, with `?${POST_DATA}` appended (this
   variable is replaced with the desired iframe URL when the app is launched)
6. Click "Save"
7. Click "Done"
8. Click "Edit" next to your newly-registered receiver (it would be nice if
   they would let you enter all the details up-front)
9. Under "Sender Details" expand "Chrome" and enter a URL under "Website URL"
   (this can be the same as your receiver URL - it doesn't seem to matter what
   it is)
10. Click "Save" again
11. Click "Publish" next to your newly-registered receiver
12. Click "Publish" again on the next page
13. Wait up to 1 hour until the "Status" of your newly-registered receiver says
    "Published"

Source: https://developers.google.com/cast/docs/registration


## Configuring your server with a custom receiver app ID

Once the receiver app is fully published, it will be available to all Cast
devices under its application ID.  You can find this ID at
https://cast.google.com/publish/ in the table of registered applications.

To configure the app ID server-side (recommended), use the following system
property:

```sh
java \
  -Dgenericwebdriver.backend.params.receiver-app-id=B602D163 \
  # ...
```

See also ["Setting parameters"][] in the ["Setup" doc][] of
[Generic WebDriver Server][].


[Generic WebDriver Server]: https://github.com/google/generic-webdriver-server
["Setting parameters"]: https://github.com/google/generic-webdriver-server/blob/master/setup.md#setting-parameters
["Setup" doc]: https://github.com/google/generic-webdriver-server/blob/master/setup.md
