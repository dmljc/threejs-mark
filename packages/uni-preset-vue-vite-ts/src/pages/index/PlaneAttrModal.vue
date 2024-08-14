<template>
    <wd-popup v-model="show" closable position="bottom" @close="handleClose">
        <wd-form ref="form" :model="model">
            <div class="mg20">剖面属性</div>
            <wd-cell-group :border="true" class="mg20">
                <wd-picker label="剖面方向" :columns="columns" v-model="model.value2" title="剖面方向" @confirm="onChange" />
                <wd-picker label="关联通道段" :columns="columns" v-model="model.value2" title="关联通道段" @confirm="onChange" />
            </wd-cell-group>
            <view class="mg20">
                <wd-button type="primary" size="large" @click="handleSubmit" block>保存</wd-button>
            </view>
        </wd-form>
    </wd-popup>
</template>

<script setup lang="tsx">
import { ref, reactive, toRefs } from "vue";

interface Props {
    show: boolean;
}

interface Model {
    value1: string;
    value2: string;
}

const props = withDefaults(defineProps<Props>(), {
    show: false,
});

const { show } = toRefs(props);
const form = ref();

const columns = ref(["正东", "正西", "正南", "正北"]);

const model = reactive<Model>({
    value1: "1",
    value2: "正北",
});

const isSubmit = ref<boolean>(false)

const emit = defineEmits(["close"]);

const handleClose = () => {
    emit("close", model);
    isSubmit.value = true;
}


const onChange = (val) => {
    console.log("val", val);
};

const handleSubmit = () => {
    form.value
        .validate()
        .then(({ valid, errors }) => {
            if (valid) {

            }
        })
        .catch((error) => {
            console.log(error, "error");
        });
};
</script>

<style lang="scss" scoped>
.mg20 {
    margin: 20px;
}
</style>
