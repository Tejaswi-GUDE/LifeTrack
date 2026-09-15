// Counsellor ↔ course routing. A counsellor is assigned one or more courses;
// a trainee's counselling requests route to the counsellor for their course.

const { User } = require('../models');

function publicCounsellor(u) {
  if (!u) return null;
  return {
    id: String(u._id),
    name: u.name,
    email: u.email || null,
    phone: u.phone || null,
    availability: u.availability || null,
    assignedCourseIds: (u.assignedCourseIds || []).map(String),
  };
}

/** all counsellor users (lean) */
async function allCounsellors() {
  return User.find({ role: 'counsellor' }).lean();
}

/**
 * The counsellor for a given course id. Falls back to the first counsellor
 * so a request is never left unrouted.
 */
async function counsellorForCourse(courseId) {
  const list = await allCounsellors();
  if (!list.length) return null;
  const cid = String(courseId || '');
  const match = list.find((u) => (u.assignedCourseIds || []).map(String).includes(cid));
  return match || list[0];
}

module.exports = { allCounsellors, counsellorForCourse, publicCounsellor };
