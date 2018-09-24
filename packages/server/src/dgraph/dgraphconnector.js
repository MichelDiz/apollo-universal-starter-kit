const dgraph = require('dgraph-js');
//const grpc = require('grpc');

const clientStub = new dgraph.DgraphClientStub(
  // addr: optional, default: "localhost:9080"admin
  'localhost:9081'
  // credentials: optional, default: grpc.credentials.createInsecure()//
  // grpc.credentials.createInsecure()
);

const dgraphClient = new dgraph.DgraphClient(clientStub);

dgraphClient.setDebugMode(true);

//! Drop All - discard all data and start from a clean slate.
/*eslint-disable */
async function dropAll() {
  const op = new dgraph.Operation();
  op.setDropAll(true);
  await dgraphClient.alter(op);
}

//! Set schema.
async function setSchemaNow() {
  const schema = `
      username: string @index(hash, trigram) .
      role: string @index(hash) .
      is_active: bool @index(bool) .
      created_at: dateTime @index(month) .
      updated_at: dateTime @index(month) .
      password_hash: password .
      email: string @index(hash) .
      serial: string @index(exact) .
      display_name: string @index(hash) .
      firstName: string @index(hash) .
      lastName: string @index(hash) .
      fullName: string @index(hash) .
      UserProfile: uid @reverse .
      comments: uid @reverse .
      UserAuth: uid @reverse .
      fbId: string @index(exact) .
      googleId: string @index(exact, ) .
      ghId: string @index(exact) .
      lnId: string @index(exact) .
      serial: string @index(exact) .
      certificate: uid .
      facebook: uid .
      google: uid .
      github: uid .
      linkedin: uid .
    `;

  const op = new dgraph.Operation();
  op.setSchema(schema);
  await dgraphClient.alter(op);
}


//! Uncomment this to set the Schema or dropAll()
//setSchemaNow();
//dropAll();

async function createData() {
  let data = require('./data.json');
  const txn = dgraphClient.newTxn();
  try {
    let mu = new dgraph.Mutation();
    mu.setSetJson(data);
    const ag = await txn.mutate(mu);
    await txn.commit();
  } catch (e) {
    if (e === dgraph.ERR_ABORTED) {
      console.log(e, 'Something happend check logs');
      // Retry or handle exception.
    } else {
      throw e;
    }
  } finally {
    await txn.discard();
  }
}

//frags for Queries
let queryForUser = `
    id : uid
    username : username
    isActive : is_active
    email : email
    password : password
    updated_at : updated_at
    role : role
    created_at : created_at
    UserProfile{ lastName :lastName}
`;

//! not working for now
async function dgraphSets() {
  try {
    dgraphClient.setDebugMode(true);
     await dropAll();
     await setSchemaNow();
     await createData();
    console.log('\nsetSchema DONE!');
  } catch (e) {
    if (e === dgraph.ERR_ABORTED) {
      console.log(e, 'Some');
      // Retry or handle exception.
    } else {
      throw e;
    }
  } 
}
//! not working for now
async function SeedSetup() {
  dgraphSets()
    .then(() => {
      console.log('\nDONE!');
    })
    .catch(e => {
      console.log('ERROR: ', e);
    });
}

//! Uncomment this to first Seed
//SeedSetup();

function strToU8(str) {
  return new Uint8Array(new Buffer(str));
}

export const run_query = async (query, notArray) => {
  let resToJson;
  let bucket;
  try {
    const res = await dgraphClient.newTxn().queryWithVars(query);
    const jsonStr = new Buffer(res.getJson_asU8()).toString();
    resToJson = JSON.parse(jsonStr);
  } catch (e) {
    if (e === dgraph.ERR_ABORTED) {
    } else {
      throw e;
    }
  }
  if (resToJson && notArray === true &&
     Object.keys(resToJson.query).length > 0 && 
     Object.keys(resToJson.query).length < 2) {
    let arrayToObjectToCall = (array) =>
      array.reduce((obj,  item ) => {
        obj['query'] = item;
        return item;
      }, {});
    bucket = arrayToObjectToCall(resToJson.query);
  } else if ((resToJson.query).length < 0){
    bucket = null;
  }else if ((resToJson.query).length === 0 && notArray !== false){
    bucket = undefined;
  }
  else {
    bucket = resToJson.query;
  }
  console.log(bucket, "bucket out")
  return bucket;
}

export const run_mutationInJSON = async (p, UIDIR, returnUID) => {
  const txn = dgraphClient.newTxn();
  let uid;
  try {
      const now = new Date().toISOString();
      let mu = new dgraph.Mutation();
      mu.setSetJson(p);

      const ag = await txn.mutate(mu);
      uid = ag.getUidsMap().get('blank-0');

      await txn.commit();
      if (returnUID !== false){
            return [{id: uid}];
          } else {
          return true;
        }
      } catch (e) {
        if (e === dgraph.ERR_ABORTED) {
        } else {
          throw e;
        }
        return false;
      } finally {
        await txn.discard();
      }

}

export const run_delInJSON = async (p) => {
  const txn = dgraphClient.newTxn();
  try {
    const now = new Date().toISOString();
    let mu = new dgraph.Mutation();
    mu.setDeleteJson(p);

    const ag = await txn.mutate(mu);
    const uid = ag.getUidsMap().get('blank-0');

    await txn.commit();

        return true;
      } catch (e) {
        if (e === dgraph.ERR_ABORTED) {
        } else {
          throw e;
        }
      } finally {
        await txn.discard();
      }

}