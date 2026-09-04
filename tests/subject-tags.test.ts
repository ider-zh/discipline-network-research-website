// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import Multiselect from "@vueform/multiselect";
import { describe, expect, it } from "vitest";
import SubjectTags from "../src/components/SubjectTags.vue";

describe("SubjectTags", () => {
  it("does not emit an empty selection", async () => {
    const wrapper = mount(SubjectTags, {
      props: { modelValue: ["Biology"], options: ["Biology", "Physics"] },
    });
    const multiselect = wrapper.findComponent(Multiselect);

    multiselect.vm.$emit("update:modelValue", []);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([["Biology"]]);

    multiselect.vm.$emit("update:modelValue", ["Physics"]);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([["Physics"]]);
  });
});
