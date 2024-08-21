<template>
    <wd-popup v-model="show" closable position="bottom" @close="handleClose">
        <wd-form ref="form" :model="model">
            <div class="mg20">管孔属性</div>
            <wd-cell-group :border="true" class="mg20">
                <wd-picker label="材质" :columns="materialColumns" v-model="model.material" title="材质" @confirm="onChange" />
                <wd-picker label="状态" :columns="statusColumns" v-model="model.status" title="状态" @confirm="onChange" />
                <wd-picker label="旋转角度" :columns="rotateColumns" v-model="model.rotate" title="旋转角度" @confirm="onChange" />
                <wd-picker label="关联电缆" :columns="cableColumns" v-model="model.cable" title="关联电缆" @confirm="onChange" />
                <wd-picker label="关联通道段" :columns="channelColumns" v-model="model.channel" title="关联通道段" @confirm="onChange" />
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
    material: string;
    status: string;
    rotate: number;
    cable: string;
    channel: string;
}

const props = withDefaults(defineProps<Props>(), {
    show: false,
});

const { show } = toRefs(props);
const form = ref();

const materialColumns = ref(["金", "银", "铜"]);
const statusColumns = ref(["正常", "封堵", "损坏"]);
const rotateColumns = ref([90]);
const cableColumns = ref(["10KV淮南温甲线", "20KV淮南温乙线", "30KV淮南温丙线"]);
const channelColumns = ref(["通道段A", "通道段B", "通道段CC"]);

const model = reactive<Model>({
    material: "金",
    status: "正常",
    rotate: 90,
    cable: "20KV淮南温乙线",
    channel: "通道段B",
});

const emit = defineEmits(["close"]);

const handleClose = () => {
    emit("close", model);
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
