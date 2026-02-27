import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

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

interface CreateProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateProjectVariables): MutationRef<CreateProjectData, CreateProjectVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateProjectVariables): MutationRef<CreateProjectData, CreateProjectVariables>;
  operationName: string;
}
export const createProjectRef: CreateProjectRef;

export function createProject(vars: CreateProjectVariables): MutationPromise<CreateProjectData, CreateProjectVariables>;
export function createProject(dc: DataConnect, vars: CreateProjectVariables): MutationPromise<CreateProjectData, CreateProjectVariables>;

interface UpsertUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
  operationName: string;
}
export const upsertUserRef: UpsertUserRef;

export function upsertUser(vars: UpsertUserVariables): MutationPromise<UpsertUserData, UpsertUserVariables>;
export function upsertUser(dc: DataConnect, vars: UpsertUserVariables): MutationPromise<UpsertUserData, UpsertUserVariables>;

interface AddCommentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddCommentVariables): MutationRef<AddCommentData, AddCommentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddCommentVariables): MutationRef<AddCommentData, AddCommentVariables>;
  operationName: string;
}
export const addCommentRef: AddCommentRef;

export function addComment(vars: AddCommentVariables): MutationPromise<AddCommentData, AddCommentVariables>;
export function addComment(dc: DataConnect, vars: AddCommentVariables): MutationPromise<AddCommentData, AddCommentVariables>;

interface DeleteCommentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteCommentVariables): MutationRef<DeleteCommentData, DeleteCommentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteCommentVariables): MutationRef<DeleteCommentData, DeleteCommentVariables>;
  operationName: string;
}
export const deleteCommentRef: DeleteCommentRef;

export function deleteComment(vars: DeleteCommentVariables): MutationPromise<DeleteCommentData, DeleteCommentVariables>;
export function deleteComment(dc: DataConnect, vars: DeleteCommentVariables): MutationPromise<DeleteCommentData, DeleteCommentVariables>;

interface AddLikeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddLikeVariables): MutationRef<AddLikeData, AddLikeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddLikeVariables): MutationRef<AddLikeData, AddLikeVariables>;
  operationName: string;
}
export const addLikeRef: AddLikeRef;

export function addLike(vars: AddLikeVariables): MutationPromise<AddLikeData, AddLikeVariables>;
export function addLike(dc: DataConnect, vars: AddLikeVariables): MutationPromise<AddLikeData, AddLikeVariables>;

interface GetProjectsByUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetProjectsByUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetProjectsByUserData, undefined>;
  operationName: string;
}
export const getProjectsByUserRef: GetProjectsByUserRef;

export function getProjectsByUser(): QueryPromise<GetProjectsByUserData, undefined>;
export function getProjectsByUser(dc: DataConnect): QueryPromise<GetProjectsByUserData, undefined>;

interface ListProjectsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProjectsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListProjectsData, undefined>;
  operationName: string;
}
export const listProjectsRef: ListProjectsRef;

export function listProjects(): QueryPromise<ListProjectsData, undefined>;
export function listProjects(dc: DataConnect): QueryPromise<ListProjectsData, undefined>;

interface GetProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProjectVariables): QueryRef<GetProjectData, GetProjectVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetProjectVariables): QueryRef<GetProjectData, GetProjectVariables>;
  operationName: string;
}
export const getProjectRef: GetProjectRef;

export function getProject(vars: GetProjectVariables): QueryPromise<GetProjectData, GetProjectVariables>;
export function getProject(dc: DataConnect, vars: GetProjectVariables): QueryPromise<GetProjectData, GetProjectVariables>;

