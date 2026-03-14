import { createApp } from 'vue';
import { PageBuilderPlugin } from '../src';
import App from './App.vue';

const app = createApp(App);
app.use(PageBuilderPlugin);
app.mount('#app');
