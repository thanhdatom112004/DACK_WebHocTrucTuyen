/**
 * Ảnh bìa khóa học: ưu tiên đường dẫn ngắn (/images/..., /uploads/...) hoặc URL hợp lệ.
 */

const DEFAULT_COURSE_IMAGE = "/images/work-1.jpg";
const MAX_IMAGE_FIELD_LEN = 2048;
const MAX_DATA_URL_LEN = 650000;

function normalizeCourseImageInput(input) {
  if (input == null || String(input).trim() === "") {
    return DEFAULT_COURSE_IMAGE;
  }
  const s = String(input).trim();
  if (s.length > MAX_IMAGE_FIELD_LEN) {
    throw new Error(
      "Đường dẫn hoặc URL ảnh quá dài (tối đa " + MAX_IMAGE_FIELD_LEN + " ký tự). Hãy dùng URL ngắn hoặc file trong /uploads/."
    );
  }
  if (s.startsWith("data:image/") && s.length > MAX_DATA_URL_LEN) {
    throw new Error(
      "Ảnh data URL quá lớn. Vui lòng tải ảnh lên server (đường dẫn /uploads/...) hoặc dùng link http/https ngắn."
    );
  }
  return s;
}

module.exports = {
  DEFAULT_COURSE_IMAGE,
  normalizeCourseImageInput,
};
