window.munetiosSearchFont = function () {
  const fallback = "Munetios UI v4 Font";
  try {
    const saved = localStorage.getItem("munetiosFontFamily");
    const migrationKey = "munetiosFont_uiV4Migration";
    if (localStorage.getItem(migrationKey)) return saved || fallback;
    localStorage.removeItem("munetiosFont_Google Sans Flex_ss01");
    localStorage.setItem(migrationKey, "1");
    if (saved !== "Google Sans Flex") return saved || fallback;
    if (localStorage.getItem("munetiosFont_Google Sans Flex_doubleStoryA") === "true" &&
        localStorage.getItem("munetiosFont_Munetios UI v4 Font_ss02") === null) {
      localStorage.setItem("munetiosFont_Munetios UI v4 Font_ss02", "true");
    }
    localStorage.setItem("munetiosFontFamily", fallback);
  } catch (error) {}
  return fallback;
};
window.munetiosSearchFont();
