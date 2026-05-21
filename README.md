# MK Media Controller

A lightweight, persistent media controller for Firefox that maintains metadata and playback state across tabs.

## Features
- **Dynamic UI:** Automatically samples artwork colors to create a seamless, non-intrusive background gradient.
- **Persistent State:** Uses `browser.storage.local` to maintain media sessions even when tabs are inactive.
- **No-Blur Design:** Optimized for clarity and performance with a modern aesthetic.
- **Universal Error Handling:** Implements standardized error codes for easier debugging.

## Tech Stack
- **Browser API:** Manifest V3, WebExtensions API.
- **Language:** Vanilla JavaScript, CSS3, HTML5.
- **Data Handling:** Canvas API for image color extraction and LocalStorage for state persistence.

## Installation for Developers
1. Clone this repository: `git clone https://github.com/MK2010GAMER/mk-media-controller.git`
2. Open Firefox and navigate to `about:debugging`.
3. Click **This Firefox** > **Load Temporary Add-on**.
4. Select the `manifest.json` file in the project folder.

## Contribution
Contributions are welcome! If you find a bug or have a suggestion, please open an issue. If you would like to submit a fix, feel free to fork the repository and submit a pull request.

## License
This project is licensed under the **Mozilla Public License 2.0**. See the `LICENSE` file for details.
