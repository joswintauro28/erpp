import api from './api';

class AccountService {
  getAll(params) {
    return api.get('/accounts/', { params });
  }

  get(id) {
    return api.get(`/accounts/${id}`);
  }

  create(data) {
    return api.post('/accounts/', data);
  }

  update(id, data) {
    return api.put(`/accounts/${id}`, data);
  }

  delete(id) {
    return api.delete(`/accounts/${id}`);
  }
}

export default new AccountService();
