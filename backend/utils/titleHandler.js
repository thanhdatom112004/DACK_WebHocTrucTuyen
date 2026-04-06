module.exports = {
  convertTitleToSlug: function (title) {
    if (!title) return "";
    let result = String(title).toLowerCase();
    result = result.replaceAll(" ", "-");
    return result;
  },
};
