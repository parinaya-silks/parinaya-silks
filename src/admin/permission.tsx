import {createContext,useContext} from 'react';
export const AdminPermissionContext=createContext(false);
export const useAdminWritePermission=()=>useContext(AdminPermissionContext);
