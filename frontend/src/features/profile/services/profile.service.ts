import { axiosInstance } from "@/shared/config/axios.config";
import { IUser } from "@/shared/identity";
import { saveUserData } from "@/shared/utils/storage.util";
import { IUpdateProfileDto } from "../interfaces/profile.interface";


class ProfileService {
  async updateProfile(data: IUpdateProfileDto): Promise<IUser> {
    const response = await axiosInstance.patch("/users/me", data);
    const updatedUser: IUser = response.data;
    
    saveUserData(updatedUser);
    return updatedUser;
  }
}

export const profileService = new ProfileService();
