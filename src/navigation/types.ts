import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Main: undefined;
  People: undefined;
  PersonProfile: { personId: string; peopleIds?: string[] };
  EditPerson: { personId: string };
  EditEncounter: { encounterId: string };
  EditReminder: { personId: string; reminderId?: string };
  EncounterForm:
    | { prefillDate?: string; prefillPersonId?: string }
    | undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
