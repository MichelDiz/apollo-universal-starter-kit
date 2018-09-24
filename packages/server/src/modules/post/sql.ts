import { orderedFor } from '../../sql/helpers';
import knex from '../../sql/connector';
import { run_query, run_mutationInJSON, run_delInJSON } from '../../dgraph/dgraphconnector';

export interface Post {
  title: string;
  content: string;
}

export interface Comment {
  postId: string;
  content: string;
}

export interface Identifier {
  id: string;
}

export default class PostDAO {
  public postsPagination(limit: number, after: number) {
    const query = `
     { query(func: has(is_a_post), first:${limit}, offset:${after}, orderasc: created_at) {
           #postsPagination
           id : uid
           title
           content
        }
      }

        `;
    // console.log(query, "query")
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public async getCommentsForPostIds(postIds: string[]) {
    const query = `
    {
      var(func: uid(${postIds}) ){
        Com as comments
      }

      query(func: uid(Com), orderasc: created_at) @normalize {
        #postsPagination
        id : uid
        content: content
      ~comments{
        postId : uid
      }
     }
    }
       `;
    // console.log(query, "query")
    const notArray = true;
    const res = await run_query(query, notArray);

    return orderedFor(res, postIds, 'postId', false);
  }

  public getTotal() {
    const query = `
     { query(func: has(is_a_post) ) {
           #getTotal
       count(uid)
        }}

        `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public post(id: any) {
    const query = `
     { query(func: uid("${id.id || id}") ) {
           #post
           id : uid
           title
           content
        }}
        `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public addPost(params: Post) {
    const returnUID = true;
    const now = new Date().toISOString();
    const p = {
      is_a_post: '',
      title: params.title,
      content: params.content,
      created_at: now
    };
    const res = async () => run_mutationInJSON(p, returnUID);
    return res();
  }

  public deletePost(id: number) {
    const p = {
      uid: id
    };

    const res = async () => run_delInJSON(p);
    return res();
  }

  public editPost({ id, title, content }: Post & Identifier) {
    const returnUID = true;
    const now = new Date().toISOString();
    const p = {
      uid: id,
      title,
      content,
      updated_at: now
    };
    const res = async () => run_mutationInJSON(p, returnUID);
    return res();
  }

  public addComment({ content, postId }: Comment) {
    const returnUID = true;
    const now = new Date().toISOString();
    const p = {
      uid: postId,
      comments: {
        is_a_comment: '',
        content,
        created_at: now
      }
    };
    const res = async () => run_mutationInJSON(p, returnUID);
    return res();
  }

  public getComment(id: any) {
    const query = `
    {
     query(func: uid("${id.id || id}") ) {
          #getComment
          id : uid
          content
       }}
       `;
    const notArray = true;
    const res = async () => run_query(query, notArray);
    return res();
  }

  public deleteComment(id: number) {
    const p = {
      uid: id
    };
    const res = async () => run_delInJSON(p);
    return res();
  }

  public editComment({ id, content }: Comment & Identifier) {
    const returnUID = true;
    const now = new Date().toISOString();
    const p = {
      uid: id,
      content,
      updated_at: now
    };
    const res = async () => run_mutationInJSON(p, returnUID);
    return res();
  }
}
