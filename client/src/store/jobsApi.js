import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "/api",
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

export const jobsApi = createApi({
  reducerPath: "jobsApi",
  baseQuery,
  tagTypes: ["Job", "Application", "AdminConfig", "Vendor", "User", "Me", "Payment", "Banner", "Webhook", "Analytics", "Settings", "Broadcast", "Blog", "Worker", "Chat"],
  endpoints: (builder) => ({
    getJobs: builder.query({
      query: (params) => ({ url: "/jobs", params }),
      providesTags: ["Job"],
    }),
    getJob: builder.query({
      query: (id) => `/jobs/${id}`,
      providesTags: (result, error, id) => [{ type: "Job", id }],
    }),
    compareJobs: builder.mutation({
      query: (ids) => ({ url: "/jobs/compare", method: "POST", body: { ids } }),
    }),
    suggestJobs: builder.query({
      query: (q) => ({ url: "/jobs/suggest", params: { q } }),
    }),
    districtStats: builder.query({
      query: () => "/jobs/stats/districts",
      providesTags: ["Job"],
    }),
    applyToJob: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}/apply`, method: "POST", body }),
      invalidatesTags: ["Application"],
    }),
    myApplications: builder.query({
      query: () => "/applications/mine",
      providesTags: ["Application"],
    }),
    myJobs: builder.query({
      query: () => "/jobs/mine",
      providesTags: ["Job"],
    }),
    createJob: builder.mutation({
      query: (body) => ({ url: "/jobs", method: "POST", body }),
      invalidatesTags: ["Job"],
    }),
    updateJob: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}`, method: "PUT", body }),
      invalidatesTags: ["Job"],
    }),
    deleteJob: builder.mutation({
      query: (id) => ({ url: `/jobs/${id}`, method: "DELETE" }),
      invalidatesTags: ["Job"],
    }),
    jobApplicants: builder.query({
      query: (id) => `/jobs/${id}/applicants`,
    }),
    updateApplicationStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/applications/${id}/status`, method: "PATCH", body: { status } }),
    }),

    vendorSignup: builder.mutation({
      query: (body) => ({ url: "/vendors/signup", method: "POST", body }),
      invalidatesTags: ["Vendor"],
    }),
    myVendor: builder.query({
      query: () => "/vendors/me",
      providesTags: ["Vendor"],
    }),
    getVendor: builder.query({
      query: (id) => `/vendors/${id}`,
      providesTags: (result, error, id) => [{ type: "Vendor", id }],
    }),
    featuredVendors: builder.query({
      query: () => "/vendors/featured",
      providesTags: ["Vendor"],
    }),
    uploadVendorDocuments: builder.mutation({
      query: (formData) => ({ url: "/vendors/me/documents", method: "POST", body: formData }),
      invalidatesTags: ["Vendor"],
    }),
    uploadVendorLogo: builder.mutation({
      query: (formData) => ({ url: "/vendors/me/logo", method: "POST", body: formData }),
      invalidatesTags: ["Vendor"],
    }),
    removeVendorLogo: builder.mutation({
      query: () => ({ url: "/vendors/me/logo", method: "DELETE" }),
      invalidatesTags: ["Vendor"],
    }),

    updateMe: builder.mutation({
      query: (body) => ({ url: "/auth/me", method: "PATCH", body }),
      invalidatesTags: ["Me"],
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: "/auth/me/password", method: "POST", body }),
    }),
    uploadAvatar: builder.mutation({
      query: (formData) => ({ url: "/auth/me/avatar", method: "POST", body: formData }),
      invalidatesTags: ["Me"],
    }),
    removeAvatar: builder.mutation({
      query: () => ({ url: "/auth/me/avatar", method: "DELETE" }),
      invalidatesTags: ["Me"],
    }),
    forgotPassword: builder.mutation({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
    }),
    resetPassword: builder.mutation({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
    }),

    getAdminConfig: builder.query({
      query: () => "/admin/config",
      providesTags: ["AdminConfig"],
    }),
    updateAdminConfig: builder.mutation({
      query: (body) => ({ url: "/admin/config", method: "PUT", body }),
      invalidatesTags: ["AdminConfig"],
    }),
    listAdminVendors: builder.query({
      query: (params) => ({ url: "/admin/vendors", params }),
      providesTags: ["Vendor"],
    }),
    updateVendorStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/admin/vendors/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["Vendor"],
    }),
    listAdminUsers: builder.query({
      query: (params) => ({ url: "/admin/users", params }),
      providesTags: ["User"],
    }),
    updateUserStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/admin/users/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["User"],
    }),
    adminCreateUser: builder.mutation({
      query: (body) => ({ url: "/admin/users", method: "POST", body }),
      invalidatesTags: ["User"],
    }),
    adminCreateVendor: builder.mutation({
      query: (body) => ({ url: "/admin/vendors", method: "POST", body }),
      invalidatesTags: ["Vendor", "User"],
    }),
    adminCreateJob: builder.mutation({
      query: (body) => ({ url: "/admin/jobs", method: "POST", body }),
      invalidatesTags: ["Job"],
    }),
    listAdminPayments: builder.query({
      query: (params) => ({ url: "/admin/payments", params }),
      providesTags: ["Payment"],
    }),
    refundPayment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/payments/${id}/refund`, method: "POST", body }),
      invalidatesTags: ["Payment"],
    }),
    updatePayment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/payments/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Payment"],
    }),
    importUsers: builder.mutation({
      query: (formData) => ({ url: "/admin/import/users", method: "POST", body: formData }),
      invalidatesTags: ["User"],
    }),
    importVendors: builder.mutation({
      query: (formData) => ({ url: "/admin/import/vendors", method: "POST", body: formData }),
      invalidatesTags: ["Vendor", "User"],
    }),
    importJobs: builder.mutation({
      query: (formData) => ({ url: "/admin/import/jobs", method: "POST", body: formData }),
      invalidatesTags: ["Job"],
    }),
    importMyJobs: builder.mutation({
      query: (formData) => ({ url: "/jobs/import", method: "POST", body: formData }),
      invalidatesTags: ["Job"],
    }),
    listEtlRuns: builder.query({
      query: (params) => ({ url: "/admin/etl/status", params }),
    }),

    getAnalytics: builder.query({
      query: () => "/admin/analytics",
      providesTags: ["Analytics"],
    }),

    activeBanner: builder.query({
      query: () => "/banners/active",
      providesTags: ["Banner"],
    }),
    listBanners: builder.query({
      query: (params) => ({ url: "/admin/banners", params }),
      providesTags: ["Banner"],
    }),
    createBanner: builder.mutation({
      query: (body) => ({ url: "/admin/banners", method: "POST", body }),
      invalidatesTags: ["Banner"],
    }),
    updateBanner: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/banners/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Banner"],
    }),
    deleteBanner: builder.mutation({
      query: (id) => ({ url: `/admin/banners/${id}`, method: "DELETE" }),
      invalidatesTags: ["Banner"],
    }),

    listWebhooks: builder.query({
      query: (params) => ({ url: "/admin/webhooks", params }),
      providesTags: ["Webhook"],
    }),
    createWebhook: builder.mutation({
      query: (body) => ({ url: "/admin/webhooks", method: "POST", body }),
      invalidatesTags: ["Webhook"],
    }),
    updateWebhook: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/webhooks/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Webhook"],
    }),
    deleteWebhook: builder.mutation({
      query: (id) => ({ url: `/admin/webhooks/${id}`, method: "DELETE" }),
      invalidatesTags: ["Webhook"],
    }),
    testWebhook: builder.mutation({
      query: (id) => ({ url: `/admin/webhooks/${id}/test`, method: "POST" }),
      invalidatesTags: ["Webhook"],
    }),

    createOrder: builder.mutation({
      query: () => ({ url: "/payments/create-order", method: "POST" }),
    }),
    verifyPayment: builder.mutation({
      query: (body) => ({ url: "/payments/verify", method: "POST", body }),
      invalidatesTags: ["Vendor"],
    }),
    createSubscriptionOrder: builder.mutation({
      query: (body) => ({ url: "/payments/subscribe/create-order", method: "POST", body }),
    }),
    verifySubscription: builder.mutation({
      query: (body) => ({ url: "/payments/subscribe/verify", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    setUserSubscription: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}/subscription`, method: "PATCH", body }),
      invalidatesTags: ["User"],
    }),

    getIntegrationSettings: builder.query({
      query: () => "/admin/settings/integrations",
      providesTags: ["Settings"],
    }),
    updateIntegrationSettings: builder.mutation({
      query: (body) => ({ url: "/admin/settings/integrations", method: "PUT", body }),
      invalidatesTags: ["Settings"],
    }),
    uploadLogo: builder.mutation({
      query: (formData) => ({ url: "/admin/branding/logo", method: "POST", body: formData }),
      invalidatesTags: ["AdminConfig"],
    }),
    listActivityLogs: builder.query({
      query: (params) => ({ url: "/admin/activity-logs", params }),
      providesTags: ["Analytics"],
    }),
    listBroadcasts: builder.query({
      query: (params) => ({ url: "/admin/broadcasts", params }),
      providesTags: ["Broadcast"],
    }),
    createEmailBroadcast: builder.mutation({
      query: (formData) => ({ url: "/admin/broadcasts/email", method: "POST", body: formData }),
      invalidatesTags: ["Broadcast"],
    }),
    createSmsBroadcast: builder.mutation({
      query: (body) => ({ url: "/admin/broadcasts/sms", method: "POST", body }),
      invalidatesTags: ["Broadcast"],
    }),

    listReviews: builder.query({
      query: (vendorId) => `/reviews/${vendorId}`,
    }),
    createReview: builder.mutation({
      query: ({ vendorId, ...body }) => ({ url: `/reviews/${vendorId}`, method: "POST", body }),
    }),

    // Workers
    listWorkers: builder.query({
      query: (params) => ({ url: "/workers", params }),
      providesTags: ["Worker"],
    }),
    getWorker: builder.query({
      query: (id) => `/workers/${id}`,
      providesTags: (r, e, id) => [{ type: "Worker", id }],
    }),
    updateMyWorkerProfile: builder.mutation({
      query: (body) => ({ url: "/workers/me/profile", method: "PUT", body }),
      invalidatesTags: ["Worker"],
    }),
    unlockWorkerContact: builder.mutation({
      query: (id) => ({ url: `/workers/${id}/unlock`, method: "POST" }),
      invalidatesTags: (r, e, id) => [{ type: "Worker", id }, "Me"],
    }),
    buyContactPack: builder.mutation({
      query: (body) => ({ url: "/workers/contact-packs/buy", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    adminVerifyWorker: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/workers/${id}/verify`, method: "PATCH", body }),
      invalidatesTags: ["Worker"],
    }),
    uploadWorkerVideo: builder.mutation({
      query: (formData) => ({ url: "/workers/me/video", method: "POST", body: formData }),
      invalidatesTags: ["Worker"],
    }),
    removeWorkerVideo: builder.mutation({
      query: () => ({ url: "/workers/me/video", method: "DELETE" }),
      invalidatesTags: ["Worker"],
    }),
    uploadVendorVideo: builder.mutation({
      query: (formData) => ({ url: "/vendors/me/video", method: "POST", body: formData }),
      invalidatesTags: ["Vendor"],
    }),
    removeVendorVideo: builder.mutation({
      query: () => ({ url: "/vendors/me/video", method: "DELETE" }),
      invalidatesTags: ["Vendor"],
    }),
    addVendorBusiness: builder.mutation({
      query: (body) => ({ url: "/vendors/me/businesses", method: "POST", body }),
      invalidatesTags: ["Vendor"],
    }),
    removeVendorBusiness: builder.mutation({
      query: (id) => ({ url: `/vendors/me/businesses/${id}`, method: "DELETE" }),
      invalidatesTags: ["Vendor"],
    }),

    // Chat
    listConversations: builder.query({
      query: () => "/chat",
      providesTags: ["Chat"],
    }),
    getConversation: builder.query({
      query: ({ userId, ...params }) => ({ url: `/chat/${userId}`, params }),
      providesTags: (r, e, { userId }) => [{ type: "Chat", id: userId }],
    }),
    sendMessage: builder.mutation({
      query: ({ userId, content }) => ({ url: `/chat/${userId}`, method: "POST", body: { content } }),
      invalidatesTags: (r, e, { userId }) => ["Chat", { type: "Chat", id: userId }],
    }),
    unreadCount: builder.query({
      query: () => "/chat/unread-count",
      providesTags: ["Chat"],
    }),

    // Blog — public
    listBlogs: builder.query({
      query: (params) => ({ url: "/blog", params }),
      providesTags: ["Blog"],
    }),
    getBlogBySlug: builder.query({
      query: (slug) => `/blog/${slug}`,
      providesTags: (r, e, slug) => [{ type: "Blog", id: slug }],
    }),
    // Blog — admin
    listAdminBlogs: builder.query({
      query: (params) => ({ url: "/admin/blog", params }),
      providesTags: ["Blog"],
    }),
    getAdminBlog: builder.query({
      query: (id) => `/admin/blog/${id}`,
      providesTags: (r, e, id) => [{ type: "Blog", id }],
    }),
    createBlog: builder.mutation({
      query: (body) => ({ url: "/admin/blog", method: "POST", body }),
      invalidatesTags: ["Blog"],
    }),
    generateBlog: builder.mutation({
      query: () => ({ url: "/admin/blog/generate", method: "POST" }),
      invalidatesTags: ["Blog"],
    }),
    updateBlog: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/blog/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Blog"],
    }),
    deleteBlog: builder.mutation({
      query: (id) => ({ url: `/admin/blog/${id}`, method: "DELETE" }),
      invalidatesTags: ["Blog"],
    }),
    importBlogs: builder.mutation({
      query: (formData) => ({ url: "/admin/blog/import", method: "POST", body: formData }),
      invalidatesTags: ["Blog"],
    }),

    // Subscriptions
    createSubscriptionOrder: builder.mutation({
      query: (body) => ({ url: "/payments/subscribe/create-order", method: "POST", body }),
    }),
    verifySubscription: builder.mutation({
      query: (body) => ({ url: "/payments/subscribe/verify", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    setUserSubscription: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}/subscription`, method: "PATCH", body }),
      invalidatesTags: ["User"],
    }),
    seedSampleBlogs: builder.mutation({
      query: () => ({ url: "/admin/blog/seed", method: "POST" }),
      invalidatesTags: ["Blog"],
    }),
    uploadAboutImage: builder.mutation({
      query: (formData) => ({ url: "/admin/branding/about-image", method: "POST", body: formData }),
      invalidatesTags: ["AdminConfig"],
    }),
    uploadContactImage: builder.mutation({
      query: (formData) => ({ url: "/admin/branding/contact-image", method: "POST", body: formData }),
      invalidatesTags: ["AdminConfig"],
    }),
    uploadTermsImage: builder.mutation({
      query: (formData) => ({ url: "/admin/branding/terms-image", method: "POST", body: formData }),
      invalidatesTags: ["AdminConfig"],
    }),
    uploadPrivacyImage: builder.mutation({
      query: (formData) => ({ url: "/admin/branding/privacy-image", method: "POST", body: formData }),
      invalidatesTags: ["AdminConfig"],
    }),
    uploadEditorImage: builder.mutation({
      query: (formData) => ({ url: "/admin/branding/editor-image", method: "POST", body: formData }),
    }),
  }),
});

export const {
  useGetJobsQuery,
  useGetJobQuery,
  useCompareJobsMutation,
  useSuggestJobsQuery,
  useDistrictStatsQuery,
  useApplyToJobMutation,
  useMyApplicationsQuery,
  useMyJobsQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
  useJobApplicantsQuery,
  useUpdateApplicationStatusMutation,
  useVendorSignupMutation,
  useMyVendorQuery,
  useGetVendorQuery,
  useFeaturedVendorsQuery,
  useUploadVendorDocumentsMutation,
  useUploadVendorLogoMutation,
  useRemoveVendorLogoMutation,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetAdminConfigQuery,
  useUpdateAdminConfigMutation,
  useUploadLogoMutation,
  useListActivityLogsQuery,
  useListBroadcastsQuery,
  useCreateEmailBroadcastMutation,
  useCreateSmsBroadcastMutation,
  useListAdminVendorsQuery,
  useUpdateVendorStatusMutation,
  useListAdminUsersQuery,
  useUpdateUserStatusMutation,
  useAdminCreateUserMutation,
  useAdminCreateVendorMutation,
  useAdminCreateJobMutation,
  useListAdminPaymentsQuery,
  useRefundPaymentMutation,
  useUpdatePaymentMutation,
  useImportUsersMutation,
  useImportVendorsMutation,
  useImportJobsMutation,
  useImportMyJobsMutation,
  useListBlogsQuery,
  useGetBlogBySlugQuery,
  useListAdminBlogsQuery,
  useGetAdminBlogQuery,
  useCreateBlogMutation,
  useGenerateBlogMutation,
  useUpdateBlogMutation,
  useDeleteBlogMutation,
  useListEtlRunsQuery,
  useGetAnalyticsQuery,
  useActiveBannerQuery,
  useListBannersQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useListWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
  useGetIntegrationSettingsQuery,
  useUpdateIntegrationSettingsMutation,
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  useListReviewsQuery,
  useCreateReviewMutation,
  useListWorkersQuery,
  useGetWorkerQuery,
  useUpdateMyWorkerProfileMutation,
  useUnlockWorkerContactMutation,
  useBuyContactPackMutation,
  useAdminVerifyWorkerMutation,
  useListConversationsQuery,
  useGetConversationQuery,
  useSendMessageMutation,
  useUnreadCountQuery,
  useImportBlogsMutation,
  useCreateSubscriptionOrderMutation,
  useVerifySubscriptionMutation,
  useSetUserSubscriptionMutation,
  useUploadWorkerVideoMutation,
  useRemoveWorkerVideoMutation,
  useUploadVendorVideoMutation,
  useRemoveVendorVideoMutation,
  useAddVendorBusinessMutation,
  useRemoveVendorBusinessMutation,
  useSeedSampleBlogsMutation,
  useUploadAboutImageMutation,
  useUploadContactImageMutation,
  useUploadTermsImageMutation,
  useUploadPrivacyImageMutation,
  useUploadEditorImageMutation,
} = jobsApi;
