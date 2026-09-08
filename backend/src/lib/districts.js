// Minimal reference data: which state each district belongs to.
//
// Provider and Trainee documents only store `district`. The Government
// dashboard's scope selector needs to group districts into states, so this
// lookup supplies that mapping (same "small seeded reference table" pattern
// as JobSkillReference). Extend as more districts are seeded.
const DISTRICT_STATE = {
  Ranchi: 'Jharkhand',
  Patna: 'Bihar',
};

function stateOfDistrict(district) {
  return DISTRICT_STATE[district] || null;
}

function districtsInState(state) {
  return Object.keys(DISTRICT_STATE).filter((d) => DISTRICT_STATE[d] === state);
}

module.exports = { DISTRICT_STATE, stateOfDistrict, districtsInState };
