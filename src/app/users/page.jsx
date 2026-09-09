"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import {
  useUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
  sendUserPasswordReset,
} from "@/hooks/useUsers";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useShifts } from "@/hooks/useShifts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Loader2,
  Clock,
  ShieldCheck,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ROLES = ["admin", "cashier"];

export default function UsersPage() {
  const { t, locale } = useI18n();
  const { user: currentUser } = useAuth();
  const { users, loading } = useUsers();
  const { restaurants } = useRestaurants();
  const { shifts, loading: shiftsLoading } = useShifts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "cashier",
    restaurantId: "",
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      displayName: "",
      role: "cashier",
      restaurantId: "",
    });
    setEditingUser(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (u) => {
    setEditingUser(u);
    setFormData({
      email: u.email,
      password: "",
      displayName: u.displayName,
      role: u.role,
      restaurantId: u.restaurantId || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingUser) {
        const data = {
          displayName: formData.displayName,
          role: formData.role,
          restaurantId:
            formData.role === "cashier" ? formData.restaurantId : null,
          restaurantName:
            formData.role === "cashier"
              ? restaurants.find((r) => r.id === formData.restaurantId)?.[
                  locale === "ar" ? "nameAr" : "nameEn"
                ] || ""
              : null,
        };
        await updateUser(editingUser.uid, data);
      } else {
        const restaurant = restaurants.find(
          (r) => r.id === formData.restaurantId,
        );
        await createUser(
          {
            email: formData.email,
            password: formData.password,
            displayName: formData.displayName,
            role: formData.role,
            restaurantId: formData.restaurantId,
            restaurantName:
              restaurant?.[locale === "ar" ? "nameAr" : "nameEn"] || "",
          },
          currentUser.uid,
        );
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving user:", error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.uid);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(error.message);
    }
    setDeleteTarget(null);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    try {
      await sendUserPasswordReset(resetTarget.email);
      alert(t.resetPasswordSent);
    } catch (error) {
      console.error("Error resetting password:", error);
    }
    setResetTarget(null);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const roleBadge = (role) => {
    const colors = {
      admin: "bg-blue-100 text-blue-800",
      cashier: "bg-green-100 text-green-800",
    };
    return (
      <Badge
        className={cn("text-xs", colors[role] || "bg-gray-100 text-gray-800")}>
        {t[role] || role}
      </Badge>
    );
  };

  const formatShiftDuration = (shift) => {
    if (!shift.clockIn) return "-";
    const start = shift.clockIn.toDate();
    const end = shift.clockOut ? shift.clockOut.toDate() : new Date();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">{t.usersTitle}</h1>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 me-2" />
          {t.addUser}
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <ShieldCheck className="w-4 h-4 me-2" />
            {t.users}
          </TabsTrigger>
          <TabsTrigger value="shifts">
            <Clock className="w-4 h-4 me-2" />
            {t.shifts}
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-50 max-w-sm">
              <Search className="absolute inset-s-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="ps-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allRoles}</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.displayName}</TableHead>
                    <TableHead>{t.email}</TableHead>
                    <TableHead>{t.role}</TableHead>
                    <TableHead>{t.restaurant}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead className="text-end">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => (
                      <TableRow key={u.uid}>
                        <TableCell className="font-medium">
                          {u.displayName}
                        </TableCell>
                        <TableCell dir="ltr" className="text-start">
                          {u.email}
                        </TableCell>
                        <TableCell>{roleBadge(u.role)}</TableCell>
                        <TableCell>{u.restaurantName || "-"}</TableCell>
                        <TableCell>
                          <Switch
                            checked={u.isActive}
                            onCheckedChange={(checked) =>
                              toggleUserActive(u.uid, checked)
                            }
                            disabled={u.uid === currentUser?.uid}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(u)}
                              title={t.edit}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setResetTarget(u)}
                              title={t.resetPassword}>
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(u)}
                              disabled={u.uid === currentUser?.uid}
                              title={t.delete}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shifts Tab */}
        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t.shiftHistory}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.displayName}</TableHead>
                    <TableHead>{t.startTime}</TableHead>
                    <TableHead>{t.endTime}</TableHead>
                    <TableHead>{t.duration}</TableHead>
                    <TableHead>{t.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : shifts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    shifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">
                          {shift.userName}
                        </TableCell>
                        <TableCell>
                          {shift.clockIn
                            ? format(shift.clockIn.toDate(), "yyyy-MM-dd HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {shift.clockOut
                            ? format(
                                shift.clockOut.toDate(),
                                "yyyy-MM-dd HH:mm",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>{formatShiftDuration(shift)}</TableCell>
                        <TableCell>
                          {shift.isActive ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              {t.activeShift}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {t.shiftEnded}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? t.editUser : t.addUser}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.displayName}</Label>
              <Input
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
              />
            </div>
            {!editingUser && (
              <>
                <div>
                  <Label>{t.email}</Label>
                  <Input
                    type="email"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>{t.password}</Label>
                  <Input
                    type="password"
                    dir="ltr"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              </>
            )}
            <div>
              <Label>{t.role}</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.role === "cashier" && (
              <div>
                <Label>{t.assignRestaurant}</Label>
                <Select
                  value={formData.restaurantId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, restaurantId: v })
                  }>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectRestaurant} />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {locale === "ar" ? r.nameAr : r.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmDeleteUser}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation */}
      <AlertDialog
        open={!!resetTarget}
        onOpenChange={() => setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.resetPassword}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.resetPasswordConfirm}
              <br />
              <strong dir="ltr">{resetTarget?.email}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              {t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
