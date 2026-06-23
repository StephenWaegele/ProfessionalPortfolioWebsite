ROLLCALL — VERSION 1

Files:
- index.html
- style.css
- script.js

How to publish inside your ProfessionalPortfolioWebsite repository:
1. Create a folder named RollCall in the root of your repository.
2. Put these three files directly inside it.
3. In your main portfolio index.html, add a project link like:
   <a href="RollCall/">Open RollCall</a>
4. In GitHub Desktop, commit the new RollCall folder and push.

Notes:
- This version is self-contained: no installs, build tools, or external libraries.
- It begins with 100 family-friendly categories and avoids repeats until all 100 are used.
- A later version can add category filtering, favorites, a category browser, persistence, and physics-based motion dice.


DOUBLES RULE
A doubles roll repeats the most recent non-doubles category and target letter count without displaying them. Points are the original non-doubles value × 2^(consecutive doubles). Example: base 6 points → first doubles 12, second doubles 24, third doubles 48. The first roll of a game automatically rerolls if doubles occur because no prior category exists yet.
