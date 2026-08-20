# v4 photo metadata

Put photos in `public/photos/v4/<collection>/`. The manifest generator scans those folders automatically, so adding, moving, or renaming a photo does not require editing React code.

To add a caption, create a text file beside the photo using the same basename. For example, `rocky.webp` reads its caption from `rocky.txt`.

Add one JSON file next to each collection folder to override the optional facts shown in the Photos inspector. The filename is the exact image filename with `.json` appended:

`src/data/v4-photo-metadata/family/nephew.png.json`

Supported fields are `date`, `location`, and `camera`:

```json
{
  "date": "2025-06-14",
  "location": "Montreal, Canada",
  "camera": "iPhone"
}
```

Dimensions and file size are generated automatically from the sanitized public image. Missing optional values show the localized “not set” label. Keep precise GPS coordinates out of these files unless you intentionally want to publish them.

When adding new photos, run `npm run optimize:photos` before building. It keeps the existing filename, strips metadata again, caps the long edge at 1600px, and only replaces a file when the result is smaller. A SHA-256 state file prevents repeatedly recompressing unchanged images.
