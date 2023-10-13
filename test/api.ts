import { expect, assert } from 'chai';
const apiUrl = 'http://127.0.0.1:3000/api/v1/';
const usersAPI = `${apiUrl}users/`;
const testUser = {
  'name': 'testuser',
  'email': 'testemail@test.com',
  'password': 'testpassword'
}
let userAuthToken = '';
describe('User API Test', () => {
  //NOTE(Alex) In order for this to work the test user should be deleted from the database manually
  describe('Register User Test', () => {
    it('Should return 204 on success', () => {
      return fetch(`${usersAPI}register`, {
        'method': 'POST',
        'headers': {
          'Content-Type': 'application/json; charset=utf-8'
        },
        'body': JSON.stringify(testUser)
      }).then(async (response: Response) => {
        expect(response.status).to.equal(204);
      }).catch(error => {
        throw error;
      }) 
    })
  })
  describe('Login User Test', () => {
    it('Should return a token on valid credentials', () => {
      return fetch(`${usersAPI}login`, {
        'method': 'POST',
        'headers': {
          'Content-Type': 'application/json; charset=utf-8'
        },
        'body': JSON.stringify(testUser)
      }).then(async (response: Response) => {
        const { token } = (await response.json()) as LoginResponse;
        userAuthToken = token;
        expect(typeof userAuthToken).to.equal('string');
      }).catch(error => {
        throw error;
      }) 
    })
  })
});
let testPost = {
  'id': -1,
  'title': 'This is a brand new post',
  'content': 'Today I wrote this beautiful piece of TS code and added to my portfolio, let me show you what I did.',
  'isHidden': false
}
const postsAPI = `${apiUrl}posts/`;
describe('Post API Test', () => {
  describe('New post', () => {
    it('Should create a new public post if the authentication is correct', () => {
      return fetch(postsAPI, {
        'method': 'POST',
        'headers': {
          'Authorization': `bearer ${userAuthToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        'body': JSON.stringify(testPost),
      }).then(async (response: Response) => {
        const data = await response.json() as PostResponse;
        testPost.id = data.id;
        expect(testPost.id).to.not.equal(-1, "Insertion failed because returned post id was not set!");
        expect(response.status).to.equal(200);
      }).catch(error => {
        throw error;
      })
    })
  })
  describe('Update post', () => {
    it('Should update an existent post if the user is the owner', () => {
      testPost.title = 'New title';
      testPost.content += '\nP.S. This is now a core function in the library';
      testPost.isHidden = true;
      return fetch(postsAPI, {
        'method': 'PUT',
        'headers': {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Authorization': `bearer ${userAuthToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        'body': JSON.stringify(testPost),
      }).then(async (response: Response) => {
        expect(response.status).to.equal(204);
      }).catch(error => {
        throw error;
      }) 
    })
  })
  describe('Delete post', () => {
    it('Should delete an existent post if the user is the owner or admin', () => {
      testPost.title = 'New title';
      testPost.content += '\nP.S. This is now a core function in the library';
      testPost.isHidden = true;
      return fetch(postsAPI, {
        'method': 'DELETE',
        'headers': {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Authorization': `bearer ${userAuthToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        'body': JSON.stringify(testPost),
      }).then(async (response: Response) => {
        expect(response.status).to.equal(204);
      }).catch(error => {
        throw error;
      }) 
    })
  })
})
type PostResponse = {
  id: number;
}
type LoginResponse = {
  token: string;
}