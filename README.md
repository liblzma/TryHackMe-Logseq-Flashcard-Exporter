# TryHackMe - Logseq Flashcard Exporter

## ✨ Features (in a nutshell)  

* Export questions from any TryHackMe room into Markdown-formatted flashcards for note-taking tool Logseq.
* Works on any TryHackMe room (`/room/<slug>`).  
* Only select relevant questions (e.g. to exclude flag-specfic questions).
* One‑click copy to clipboard.  


## 📖 What is Logseq?  

[Logseq]([url](https://logseq.com/)) is a free and versatile open‑source knowledge‑base / note‑taking tool that uses plain‑text markdown.  
Flashcards are created by adding a `#card` tag to a line – Logseq then turns the entry into a spaced‑repetition flashcard.


## 🚀 How to install  

1. **Install a userscript manager** in your browser – e.g. [Violentmonkey](https://violentmonkey.github.io/), [Tampermonkey](https://www.tampermonkey.net/) or any other that supports `GM_*` APIs.  
2. Click on the **raw link** of the script: [tryhackme‑logseq‑flashcard-exporter.user.js](https://github.com/liblzma/TryHackMe-Logseq-Flashcard-Exporter/raw/main/tryhackme‑logseq‑flashcard-exporter.user.js)
    - The userscript manager will prompt you to install the script.


## 🎬 How to use  

1. Open a TryHackMe room, e.g. `https://tryhackme.com/room/introtok8s`.  
2. Open the userscript menu (Violentmonkey → **“Export as flashcards”**)  

   ![Menu entry](https://github.com/user-attachments/assets/d2241451-4166-449a-9164-13a04b9e850e)

3. A small modal appears.  
   * Select the questions you want to export. 
   * Click **“Create flash‑cards”**.  

   ![Modal UI](https://github.com/user-attachments/assets/120d369f-35d1-4289-a704-8a7894b3b526)


4. The generated markdown is shown in a textarea together with a **Copy** button.  

   ![Result view](https://github.com/user-attachments/assets/d6478dc3-8e7d-43b1-ae04-ea36236acb1b)


5. Paste the markdown into any Logseq page. Each line containing `#card` becomes a flashcard.

   ![Logseq flashcard overview](https://github.com/user-attachments/assets/d3f0790d-be54-47cc-9abd-1569942c6b29)

6. Use Logseq's flashcard feature to reinforce your newly gained knowledge:

   ![Logseq flashcard usage](https://github.com/user-attachments/assets/eebff025-a01c-4eda-8b0d-f675bdce3c0d)

   ![Logseq flashcard usage #2](https://github.com/user-attachments/assets/a01ae2fa-5a5a-425e-9f3c-f19b366fae4b)



## 🛠️ Development & Contribution  

* Fork the repo, make your changes, and open a PR.  
* Issues are welcome – especially bug reports or feature ideas.  


## 📄 License  

This project is licensed under the **GNU General Public License v3.0**.  
See the full text in the file [`LICENSE`](./LICENSE).
