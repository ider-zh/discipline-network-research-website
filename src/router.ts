import { createRouter, createWebHistory } from "vue-router";
import { openAlexOmniTreeUrl } from "./externalProjects";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: "/", name: "home", component: () => import("./views/HomeView.vue") },
    { path: "/charts", name: "charts", component: () => import("./views/ChartsView.vue") },
    {
      path: "/charts/openalex-concepts",
      component: () => import("./views/ExternalRedirectView.vue"),
      props: { title: "OpenAlex Topics & Concepts Tree (2026)", url: openAlexOmniTreeUrl },
    },
    { path: "/charts/openalex-node-edge", component: () => import("./views/OpenAlexNodeEdgeView.vue") },
    { path: "/charts/openalex-entropy", component: () => import("./views/OpenAlexEntropyView.vue") },
    { path: "/charts/wm-disruption", component: () => import("./views/WmDisruptionView.vue") },
    { path: "/charts/wikipedia-network", component: () => import("./views/WikipediaNetworkView.vue") },
    { path: "/charts/wikipedia-article-count", component: () => import("./views/WikipediaArticleCountView.vue") },
    { path: "/charts/wikipedia-network-profile", component: () => import("./views/WikipediaNetworkProfileView.vue") },
    { path: "/charts/wikipedia-degree-entropy", component: () => import("./views/WikipediaDegreeEntropyView.vue") },
    { path: "/charts/wikipedia-structural-entropy", component: () => import("./views/WikipediaStructuralEntropyView.vue") },
    { path: "/charts/mag-subject-entropy", component: () => import("./views/MagSubjectEntropyView.vue") },
    { path: "/charts/mag-citation-network", component: () => import("./views/MagCitationNetworkView.vue") },
    { path: "/charts/mag-disruption-structure", component: () => import("./views/MagDisruptionStructureView.vue") },
    { path: "/charts/snapshots/:slug", component: () => import("./views/SeriesSnapshotView.vue") },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

export default router;
