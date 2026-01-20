import api from "./api";

export const saveContact = (data: any) =>
  api.post("/contacts/", data);

export const getContacts = () =>
  api.get("/contacts/");

export const getContactById = (id: string) =>
  api.get(`/contacts/${id}`);

export const searchContacts = (query: string) =>
  api.get("/contacts/search", {
    params: { q: query },
  });


export const deleteContact = (contactId: string) =>
  api.delete(`/contacts/${contactId}`);
