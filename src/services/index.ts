export {
  createPerson,
  findPeopleByName,
  findCanonicalPersonByName,
  getPersonById,
  getAllPeople,
  updatePerson,
  deletePerson,
} from "./personService";

export {
  createEncounter,
  updateEncounter,
  getEncounterById,
  getEncountersForPerson,
  getEncountersByDate,
  getRecentEncounters,
  getAllEncounters,
  deleteEncountersForPerson,
} from "./encounterService";
