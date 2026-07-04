import api from './api';

class AccountService {
  getAll(params: any): Promise<any> {
    return api.get('/accounts/', { params });
  }

  get(id: any): Promise<any> {
    return api.get(`/accounts/${id}`);
  }

  create(data: any): Promise<any> {
    return api.post('/accounts/', data);
  }

  update(id: any, data: any): Promise<any> {
    return api.put(`/accounts/${id}`, data);
  }

  delete(id: any): Promise<any> {
    return api.delete(`/accounts/${id}`);
  }
}

const accountService = new AccountService();
export default accountService;
