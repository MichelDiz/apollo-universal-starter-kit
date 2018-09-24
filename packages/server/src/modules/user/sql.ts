// Helpers
import { has } from 'lodash';

import knex from '../../sql/connector';
import { returnId } from '../../sql/helpers';

import { run_query, run_mutationInJSON, run_delInJSON } from '../../dgraph/dgraphconnector';

function strToU8(str: string): Uint8Array {
  return new Uint8Array(new Buffer(str));
}

// frags for Queries
const queryForUser = `
    id : uid
    username : username
    email : email
    password : password
    isActive : is_active
    updated_at : updated_at
    role : role
    created_at : created_at
    serial
    fbDisplayName
    lnDisplayName
    ghDisplayName
    googleDisplayName : display_name
`;
const UserProfile = `
 UserProfile {
    firstName : firstName
    lastName : lastName
    fullName
      }
`;
const FacebookAuth = `
      fbId
      displayName
`;
const GoogleAuth = `
      googleId
      displayName
`;
const GithubAuth = `
      ghId
      displayName
`;
const LinkedInAuth = `
      lnId
      displayName
`;
const CertificateAuth = `
      serial
`;
const UserAuth = `
      auth {
        certificate {${CertificateAuth}}
        facebook {${FacebookAuth}}
        google {${GoogleAuth}}
        github {${GithubAuth}}
        linkedin {${LinkedInAuth}}
      }
`;

// Actual query fetching and transformation in DB
class User {
  public async getUsers(orderBy: any, filter: any) {
    let order = 'asc';
    let column = 'username';
    // add order by
    if (orderBy && orderBy.column) {
      orderBy.column !== 'isActive' ? (column = orderBy.column) : (column = 'is_active');
    }

    if (orderBy && orderBy.order) {
      order = orderBy.order;
    }

    let dgraphFilters = '';

    // add filter conditions
    if (filter) {
      let dgraphFilterRole = '';
      let dgraphFilterisActive = '';
      let dgraphFiltersearchText = '';
      let AND = '';
      let AND2 = '';
      if (has(filter, 'role') && filter.role !== '') {
        dgraphFilterRole = `eq(role, "${filter.role}")`;
      }
      if (has(filter, 'isActive') && filter.isActive === true) {
        dgraphFilterisActive = ` eq(is_active, "true")`;
      }

      if (has(filter, 'searchText') && filter.searchText !== '') {
        dgraphFiltersearchText = `regexp(username, /^${filter.searchText}.*$/) or eq(email, "${
          filter.searchText
        }") or eq(firstName, "${filter.searchText}") or eq(lastName, "${filter.searchText}")`;
      }

      if (
        (has(filter, 'isActive') &&
          filter.isActive === true &&
          has(filter, 'searchText') &&
          filter.searchText !== '') ||
        (filter.isActive === true && has(filter, 'role') && filter.role !== '')
      ) {
        AND = 'and';
      }
      if (has(filter, 'role') && filter.role !== '' && has(filter, 'searchText') && filter.searchText !== '') {
        AND2 = 'AND';
      }
      dgraphFilters = `@filter(${dgraphFilterisActive} ${AND} ${dgraphFilterRole} ${AND2}
          ${dgraphFiltersearchText}
          )`;
    }
    const notArray = false;
    const query = `
     { query(func: has(username), order${order}: ${column})
     ${dgraphFilters} @normalize
     {
           #getUsers
           ${queryForUser}
           ${UserAuth}
           ${UserProfile}
        }
      }
        `;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public async getUser(id: any) {
    const query = `
     { query(func: uid("${id}") ) @normalize {
           #getUser
           ${queryForUser}
           ${UserAuth}
           ${UserProfile}
        }}

        `;
    //  console.log(query, "query")
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public async getUserWithPassword(id: any) {
    // Get Password? not really...
    const query = `
     { query(func: uid("${id}") ) {
           ${queryForUser}
           ${UserProfile}
           created_at
           updated_at
        }
      }
        `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public async getUserWithSerial(serial: any) {
    const query = `
     { query(func: uid("${serial}") ) {
           ${queryForUser}
           ${UserProfile}
           created_at
           updated_at
        }
      }
        `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public async register({ username, email, password, role, isActive }: any) {
    if (role === undefined) {
      role = 'user';
    }
    const p = {
      username,
      email,
      role,
      password_hash: password,
      is_active: !!isActive
    };
    const res = async () => run_mutationInJSON(p);
    return res();
  }

  public async createFacebookAuth({ id, displayName, userId }: any) {
    const p = {
      uid: userId,
      UserAuth: {
        fbId: id,
        display_name: displayName
      }
    };
    const res = async () => run_mutationInJSON(p);
    return res();
  }

  public async createGithubAuth({ id, displayName, userId }: any) {
    const p = {
      uid: userId,
      UserAuth: {
        ghId: id,
        display_name: displayName
      }
    };
    const res = async () => run_mutationInJSON(p);
    return res();
  }

  public async createGoogleOAuth({ id, displayName, userId }: any) {
    const p = {
      uid: userId,
      UserAuth: {
        googleId: id,
        display_name: displayName
      }
    };
    const res = async () => run_mutationInJSON(p);
    return res();
  }

  public async createLinkedInAuth({ id, displayName, userId }: any) {
    const p = {
      uid: userId,
      UserAuth: {
        lnId: id,
        display_name: displayName
      }
    };
    const res = async () => run_mutationInJSON(p);
    return res();
  }

  public async editUser({ id, username, email, role, isActive, password }: any) {
    const localAuthInput = { email };
    const returnUID = false;
    const UIDIR = id;
    const p = {
      uid: id,
      ...(username !== '' ? { username } : null),
      ...(email !== '' ? { email } : null),
      ...(role !== undefined ? { role } : null),
      ...(isActive !== undefined ? { is_active: isActive } : null),
      ...(password !== '' ? { password_hash: password } : null)
    };
    const res = async () => run_mutationInJSON(p, UIDIR, returnUID);
    return res();
  }

  public async editUserProfile({ id, profile }: any) {
    const UIDIR = id;
    const { firstName, lastName } = profile;
    const notArray = true;
    let userProfileUID;
    const query = `
    { var(func: uid("${id}") ) {
      #editUserProfile
      UserProfile { G as uid }
         }
         query(func: uid(G) ) {
           uid
             }
      }
       `;
    const userProfile = async () => run_query(query, notArray);
    userProfileUID = await userProfile();
    if (userProfileUID && userProfileUID.uid) {
      const p = {
        uid: userProfileUID.uid,
        firstName,
        lastName
      };

      const res = async () => run_mutationInJSON(p, UIDIR);
      return res();
    } else {
      const p = {
        uid: id,
        UserProfile: {
          firstName,
          lastName
        }
      };

      const res = async () => run_mutationInJSON(p, UIDIR);
      return res();
    }
  }

  public async editAuthCertificate({
    uid: id,
    auth: {
      certificate: { serial }
    }
  }: any) {
    const userProfile = await knex
      .select('id')
      .from('auth_certificate')
      .where({ user_id: id })
      .first();

    if (userProfile) {
      return knex('auth_certificate')
        .update({ serial })
        .where({ user_id: id });
    } else {
      return returnId(knex('auth_certificate')).insert({ serial, user_id: id });
    }
  }

  public deleteUser(id: string) {
    const p = {
      uid: id
    };

    const res = async () => run_delInJSON(p);
    return res();
  }

  public async updatePassword(id: string, newPassword: string) {
    const p = {
      uid: id,
      password_hash: newPassword
    };
    const res = async () => run_mutationInJSON(p);
    return res();
  }

  public updateActive(id: any, isActive: any) {
    const p = {
      uid: id,
      is_active: isActive
    };
    const res = async () => run_mutationInJSON(p);
    return res();
  }

  public async getUserByEmail(email: any) {
    const query = `
      {query(func: eq(email, "${email}") ) {
        #getUserByEmail
        ${queryForUser}
        ${UserProfile}
          }
      }
      `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public async getUserByFbIdOrEmail(id: any, email: any) {
    const query = `
      {query(func: eq(email, "${email}") ) {
        #getUserByFbIdOrEmail
        ${queryForUser}
        ${UserProfile}
          }
      }
      `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public async getUserByLnInIdOrEmail(id: any, email: any) {
    const query = `
      {query(func: eq(email, "${email}") ) {
        #getUserByLnInIdOrEmail
        ${queryForUser}
        ${UserProfile}
          }
      }
      `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public async getUserByGHIdOrEmail(id: any, email: any) {
    const query = `
      {query(func: eq(email, "${email}") ) {
        #getUserByGHIdOrEmail
        ${queryForUser}
        ${UserProfile}
          }
      }
      `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
  }

  public async getUserByGoogleIdOrEmail(id: any, email: any) {
    const query = `
      {query(func: eq(email, "${email}") ) {
        #getUserByGoogleIdOrEmail
        ${queryForUser}
        ${UserProfile}
          }
      }
      `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
  }

  public async getUserByUsername(username: any) {
    const query = `
      {query(func: eq(username, "${username}") ) {
        #getUserByUsername
          ${queryForUser}
          ${UserProfile}
            }
        }
          `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public async getUserByUsernameOrEmail(usernameOrEmail: any, password: any) {
    const query = `
      {    query(func: eq(email, "${usernameOrEmail}") ) {
                #getUserByUsernameOrEmail
                ${queryForUser}
                ${UserProfile}
                checkpwd(password_hash, "${password}")
            }
        }
          `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }
}
const userDAO = new User();

export default userDAO;
