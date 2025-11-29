export interface AuthProfile {
  googleUid: string;
  email: string;
  fullName: string;
  photoUrl?: string;
}

export interface StoredAuthProfile extends AuthProfile {
  id?: string;
  accessToken?: string;
  refreshToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GoogleTokenPayload {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
  id_token?: string;
}
