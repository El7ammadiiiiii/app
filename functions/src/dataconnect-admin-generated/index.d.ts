import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface AddCommentData {
  comment_insert: Comment_Key;
}

export interface AddCommentVariables {
  projectId: UUIDString;
  content: string;
}

export interface AddLikeData {
  like_insert: Like_Key;
}

export interface AddLikeVariables {
  projectId: UUIDString;
}

export interface ChallengeEntry_Key {
  userId: UUIDString;
  challengeId: UUIDString;
  projectId: UUIDString;
  __typename?: 'ChallengeEntry_Key';
}

export interface Challenge_Key {
  id: UUIDString;
  __typename?: 'Challenge_Key';
}

export interface Comment_Key {
  id: UUIDString;
  __typename?: 'Comment_Key';
}

export interface CreateProjectData {
  project_insert: Project_Key;
}

export interface CreateProjectVariables {
  title: string;
  description: string;
  imageUrl: string;
  craftType?: string | null;
  difficultyLevel?: string | null;
  materialsUsed?: string[] | null;
}

export interface DeleteCommentData {
  comment_deleteMany: number;
}

export interface DeleteCommentVariables {
  id: UUIDString;
}

export interface GetProjectData {
  project?: {
    id: UUIDString;
    title: string;
    description: string;
    imageUrl: string;
    createdAt: TimestampString;
    craftType?: string | null;
    materialsUsed?: string[] | null;
    difficultyLevel?: string | null;
    user?: {
      username: string;
      displayName?: string | null;
      profilePictureUrl?: string | null;
    };
      comments_on_project: ({
        id: UUIDString;
        content: string;
        createdAt: TimestampString;
        user?: {
          username: string;
          displayName?: string | null;
        };
      } & Comment_Key)[];
        likes_on_project: ({
          user: {
            username: string;
          };
        })[];
  } & Project_Key;
}

export interface GetProjectVariables {
  id: UUIDString;
}

export interface GetProjectsByUserData {
  projects: ({
    id: UUIDString;
    title: string;
    description: string;
    imageUrl: string;
    createdAt: TimestampString;
    craftType?: string | null;
    materialsUsed?: string[] | null;
    difficultyLevel?: string | null;
  } & Project_Key)[];
}

export interface Like_Key {
  userId: UUIDString;
  projectId: UUIDString;
  __typename?: 'Like_Key';
}

export interface ListProjectsData {
  projects: ({
    id: UUIDString;
    title: string;
    description: string;
    imageUrl: string;
    createdAt: TimestampString;
    craftType?: string | null;
    materialsUsed?: string[] | null;
    difficultyLevel?: string | null;
    user?: {
      username: string;
      displayName?: string | null;
    };
  } & Project_Key)[];
}

export interface Project_Key {
  id: UUIDString;
  __typename?: 'Project_Key';
}

export interface UpsertUserData {
  user_upsert: User_Key;
}

export interface UpsertUserVariables {
  username: string;
  email: string;
  displayName?: string | null;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

/** Generated Node Admin SDK operation action function for the 'CreateProject' Mutation. Allow users to execute without passing in DataConnect. */
export function createProject(dc: DataConnect, vars: CreateProjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateProjectData>>;
/** Generated Node Admin SDK operation action function for the 'CreateProject' Mutation. Allow users to pass in custom DataConnect instances. */
export function createProject(vars: CreateProjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateProjectData>>;

/** Generated Node Admin SDK operation action function for the 'UpsertUser' Mutation. Allow users to execute without passing in DataConnect. */
export function upsertUser(dc: DataConnect, vars: UpsertUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpsertUserData>>;
/** Generated Node Admin SDK operation action function for the 'UpsertUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function upsertUser(vars: UpsertUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpsertUserData>>;

/** Generated Node Admin SDK operation action function for the 'AddComment' Mutation. Allow users to execute without passing in DataConnect. */
export function addComment(dc: DataConnect, vars: AddCommentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddCommentData>>;
/** Generated Node Admin SDK operation action function for the 'AddComment' Mutation. Allow users to pass in custom DataConnect instances. */
export function addComment(vars: AddCommentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddCommentData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteComment' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteComment(dc: DataConnect, vars: DeleteCommentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteCommentData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteComment' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteComment(vars: DeleteCommentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteCommentData>>;

/** Generated Node Admin SDK operation action function for the 'AddLike' Mutation. Allow users to execute without passing in DataConnect. */
export function addLike(dc: DataConnect, vars: AddLikeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddLikeData>>;
/** Generated Node Admin SDK operation action function for the 'AddLike' Mutation. Allow users to pass in custom DataConnect instances. */
export function addLike(vars: AddLikeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddLikeData>>;

/** Generated Node Admin SDK operation action function for the 'GetProjectsByUser' Query. Allow users to execute without passing in DataConnect. */
export function getProjectsByUser(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetProjectsByUserData>>;
/** Generated Node Admin SDK operation action function for the 'GetProjectsByUser' Query. Allow users to pass in custom DataConnect instances. */
export function getProjectsByUser(options?: OperationOptions): Promise<ExecuteOperationResponse<GetProjectsByUserData>>;

/** Generated Node Admin SDK operation action function for the 'ListProjects' Query. Allow users to execute without passing in DataConnect. */
export function listProjects(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListProjectsData>>;
/** Generated Node Admin SDK operation action function for the 'ListProjects' Query. Allow users to pass in custom DataConnect instances. */
export function listProjects(options?: OperationOptions): Promise<ExecuteOperationResponse<ListProjectsData>>;

/** Generated Node Admin SDK operation action function for the 'GetProject' Query. Allow users to execute without passing in DataConnect. */
export function getProject(dc: DataConnect, vars: GetProjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetProjectData>>;
/** Generated Node Admin SDK operation action function for the 'GetProject' Query. Allow users to pass in custom DataConnect instances. */
export function getProject(vars: GetProjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetProjectData>>;

