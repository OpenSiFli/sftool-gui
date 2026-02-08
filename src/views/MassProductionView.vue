<template>
  <div class="h-screen flex flex-row overflow-hidden bg-base-200">
    <div class="flex-1 flex flex-col min-w-0">
      <div class="bg-base-100 shadow-sm p-4 z-10 flex items-center justify-between">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <span class="material-icons text-primary">grid_view</span>
          {{ t('massProduction.portStatus') }}
        </h1>

        <div class="flex items-center gap-4">
          <button class="btn btn-sm btn-ghost gap-2" @click="showFilterModal = true" :disabled="isEnabled">
            <span class="material-icons text-sm">filter_alt</span>
            {{ t('massProduction.filterSettings') }}
            <div
              class="badge badge-xs badge-primary"
              v-if="
                massProductionStore.isFilterEnabled &&
                (massProductionStore.whitelist.length > 0 || massProductionStore.blacklist.length > 0)
              "
            ></div>
          </button>

          <div class="divider divider-horizontal mx-0"></div>

          <label class="label cursor-pointer gap-2 bg-base-200 px-3 py-1 rounded-lg">
            <span class="label-text font-medium">{{ t('massProduction.autoDownload') }}</span>
            <input
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              v-model="autoDownloadModel"
              :disabled="isAutoDownloadSyncing"
            />
          </label>

          <button class="btn btn-sm btn-ghost gap-2" @click="refreshPorts" :disabled="isRefreshing">
            <span class="material-icons text-sm" :class="{ 'animate-spin': isRefreshing }">refresh</span>
            {{ t('massProduction.refreshPorts') }}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 relative">
        <div
          v-if="!isEnabled"
          class="absolute inset-0 z-10 bg-base-100/60 backdrop-blur-sm flex items-center justify-center"
        >
          <div class="text-center p-8 bg-base-100 shadow-xl rounded-2xl border border-base-300">
            <span class="material-icons text-6xl text-primary mb-4 opacity-80">rocket_launch</span>
            <h3 class="text-xl font-bold mb-2">{{ t('massProduction.readyToStart') }}</h3>
            <p class="text-base-content/60 max-w-xs mx-auto">{{ t('massProduction.startHint') }}</p>
          </div>
        </div>

        <div v-if="ports.length === 0" class="h-full flex flex-col items-center justify-center text-base-content/50">
          <span class="material-icons text-6xl mb-4 text-base-content/20">usb_off</span>
          <p class="text-lg font-medium">{{ t('massProduction.noPortsDetected') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div
            v-for="port in ports"
            :key="port.name"
            class="card bg-base-100 shadow-md border border-base-200 transition-all duration-300"
            :class="{
              'opacity-50 grayscale': !massProductionStore.isPortAllowed(port),
              'border-success bg-success/5': port.status === 'success' && massProductionStore.isPortAllowed(port),
              'border-error bg-error/5': port.status === 'error' && massProductionStore.isPortAllowed(port),
              'border-primary bg-primary/5': port.status === 'flashing' && massProductionStore.isPortAllowed(port),
              'border-warning bg-warning/5': port.status === 'queued' && massProductionStore.isPortAllowed(port),
            }"
          >
            <div class="card-body p-4">
              <div class="flex justify-between items-start mb-2">
                <div class="min-w-0 flex-1 pr-2">
                  <div class="font-bold flex items-center gap-2 flex-wrap">
                    <span class="leading-tight break-all" :class="getPortNameClass(port.name)" :title="port.name">
                      {{ port.name }}
                    </span>
                    <span
                      v-if="!massProductionStore.isPortAllowed(port)"
                      class="badge badge-xs badge-ghost text-[10px]"
                    >
                      {{ t('massProduction.filtered') }}
                    </span>
                  </div>
                  <div class="text-xs text-base-content/60">{{ port.chip || t('massProduction.unknownChip') }}</div>
                </div>
                <div
                  class="badge badge-sm text-[10px] leading-tight"
                  :class="getStatusBadgeClass(port.status)"
                  v-if="massProductionStore.isPortAllowed(port)"
                >
                  {{ t(`massProduction.status.${port.status}`) }}
                </div>
              </div>

              <div
                class="w-full h-2 bg-base-200 rounded-full overflow-hidden mb-2"
                v-if="massProductionStore.isPortAllowed(port)"
              >
                <div
                  class="h-full transition-all duration-300"
                  :class="getStatusProgressClass(port.status)"
                  :style="{ width: `${port.progress}%` }"
                ></div>
              </div>

              <div class="text-xs truncate text-base-content/70" :title="port.message || undefined">
                {{ port.message || '-' }}
              </div>

              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-[10px] text-base-content/60 truncate" :title="getPortLogLabel(port.name)">
                  {{ getPortLogLabel(port.name) }}
                </span>
                <button
                  class="btn btn-ghost btn-xs min-h-0 h-6 px-2"
                  :disabled="!sessionId"
                  @click="openPortLog(port.name)"
                >
                  <span class="material-icons text-xs">description</span>
                  {{ t('massProduction.openPortLog') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="w-80 bg-base-100 shadow-xl z-20 flex flex-col border-l border-base-300">
      <div class="p-4 border-b border-base-300">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <span class="material-icons text-primary">settings_applications</span>
          {{ t('massProduction.configuration') }}
        </h2>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-6">
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">{{ t('massProduction.chipModel') }}</span>
          </label>
          <div class="relative">
            <input
              type="text"
              v-model="chipSearchInput"
              @focus="handleFocus('chip')"
              @blur="handleBlur('chip')"
              @keydown="handleChipKeyDown"
              :placeholder="t('deviceConnection.chipSearchPlaceholder')"
              class="input input-bordered input-sm w-full pr-10"
              :disabled="isEnabled"
            />
            <div
              class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
              @click="!isEnabled && toggleChipDropdown()"
            >
              <span
                class="material-icons transform transition-transform duration-300 text-sm"
                :class="{ 'rotate-180': showChipDropdown }"
              >
                keyboard_arrow_down
              </span>
            </div>
            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="showChipDropdown"
                class="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-md shadow-lg max-h-60 overflow-auto origin-top"
              >
                <div
                  v-for="chip in filteredChips"
                  :key="chip.id"
                  class="p-2 hover:bg-primary/10 cursor-pointer transition-colors duration-200"
                  @mousedown.prevent
                  @click="selectChip(chip)"
                >
                  <div class="font-semibold text-xs">{{ chip.name }}</div>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">{{ t('massProduction.storageType') }}</span>
          </label>
          <select
            class="select select-bordered select-sm w-full"
            v-model="selectedMemoryType"
            :disabled="isEnabled || !selectedChip"
          >
            <option disabled value="">{{ t('massProduction.storageTypePlaceholder') }}</option>
            <option v-for="type in availableMemoryTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">{{ t('massProduction.maxConcurrency') }}</span>
          </label>
          <input
            type="number"
            class="input input-bordered input-sm w-full"
            min="1"
            max="32"
            v-model.number="maxConcurrencyModel"
            :disabled="isEnabled"
          />
          <label class="label pt-1">
            <span class="label-text-alt text-base-content/60">{{ t('massProduction.maxConcurrencyHint') }}</span>
          </label>
        </div>

        <div class="form-control flex-1 flex flex-col min-h-0">
          <label class="label justify-between">
            <span class="label-text font-semibold">{{ t('massProduction.firmwareFiles') }}</span>
            <button class="btn btn-xs btn-outline btn-primary" @click="addFile" :disabled="isEnabled">
              <span class="material-icons text-xs">add</span>
            </button>
          </label>

          <div class="flex-1 overflow-y-auto space-y-2 pr-1">
            <FlashFileCard
              v-for="(file, index) in writeFlashStore.selectedFiles"
              :key="file.id"
              :file="file"
              :index="index"
              :disabled="isEnabled"
            />

            <div
              v-if="writeFlashStore.selectedFiles.length === 0"
              class="text-center text-base-content/40 py-8 text-xs border-2 border-dashed border-base-300 rounded-lg cursor-pointer hover:border-primary hover:bg-base-200/50 transition-colors"
              @click="!isEnabled && addFile()"
            >
              <span class="material-icons text-3xl mb-2 opacity-50">note_add</span>
              <div>{{ t('massProduction.noFiles') }}</div>
            </div>
          </div>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">{{ t('massProduction.sessionSummary') }}</span>
          </label>
          <div class="bg-base-200/70 rounded-lg p-3 text-xs space-y-1">
            <template v-if="currentSession">
              <div class="flex justify-between">
                <span>{{ t('massProduction.startedAt') }}</span
                ><span>{{ formatTime(currentSession.startedAt) }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t('massProduction.endedAt') }}</span
                ><span>{{ currentSession.endedAt ? formatTime(currentSession.endedAt) : '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t('massProduction.total') }}</span
                ><span>{{ currentSession.total }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t('massProduction.success') }}</span
                ><span class="text-success">{{ currentSession.success }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t('massProduction.failed') }}</span
                ><span class="text-error">{{ currentSession.failed }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t('massProduction.manualStopped') }}</span
                ><span>{{ currentSession.manualStopped ? t('massProduction.yes') : t('massProduction.no') }}</span>
              </div>
            </template>
            <div v-else class="text-base-content/60">{{ t('massProduction.noSessionData') }}</div>
          </div>
        </div>

        <div class="form-control">
          <label class="label justify-between gap-2">
            <span class="label-text font-semibold">{{ t('massProduction.sessionHistory') }}</span>
            <button class="btn btn-xs btn-ghost gap-1" @click="openMassProductionLogDirectory">
              <span class="material-icons text-sm">folder_open</span>
              {{ t('massProduction.openLogDirectory') }}
            </button>
          </label>
          <div class="bg-base-200/70 rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
            <div v-if="recentSessionLogs.length === 0" class="text-xs text-base-content/60 p-2">
              {{ t('massProduction.noSessionData') }}
            </div>
            <div
              v-for="session in recentSessionLogs"
              :key="session.sessionId"
              class="rounded p-2 text-xs border cursor-pointer transition-colors"
              :class="
                isSelectedSession(session.sessionId)
                  ? 'bg-primary/5 border-primary/50'
                  : 'bg-base-100 border-base-300/60 hover:border-primary/30'
              "
              @click="selectSession(session.sessionId)"
            >
              <div class="flex justify-between font-semibold">
                <span>#{{ session.sessionId }}</span>
                <span>{{ formatTime(session.startedAt) }}</span>
              </div>
              <div class="mt-1 flex justify-between text-base-content/70">
                <span>{{ session.success }}/{{ session.total }}</span>
                <span class="text-error" v-if="session.failed > 0">
                  {{ t('massProduction.failedCount', { count: session.failed }) }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="massProductionStore.logPaths" class="text-[10px] text-base-content/60 mt-1 break-all px-1">
            {{ massProductionStore.logPaths.runtime_log_path }}
          </div>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">{{ t('massProduction.failedPortDetails') }}</span>
          </label>
          <div class="bg-base-200/70 rounded-lg p-2 max-h-52 overflow-y-auto custom-scrollbar space-y-2">
            <div v-if="!selectedSessionForDetail" class="text-xs text-base-content/60 p-2">
              {{ t('massProduction.noSessionData') }}
            </div>
            <div v-else-if="failedPortEvents.length === 0" class="text-xs text-base-content/60 p-2">
              {{ t('massProduction.noFailedPortDetails') }}
            </div>
            <div
              v-for="event in failedPortEvents"
              :key="event.id"
              class="bg-base-100 rounded p-2 text-xs border border-base-300/60"
            >
              <div class="flex justify-between items-center">
                <span class="font-semibold text-error">{{ event.portName }}</span>
                <span class="text-[10px] text-base-content/60">{{ formatTime(event.timestamp) }}</span>
              </div>
              <div class="mt-1 text-[11px] text-base-content/80 break-all">
                {{ event.message || t('massProduction.noErrorMessage') }}
              </div>
              <div class="mt-1 text-[10px] text-base-content/60 flex justify-between">
                <span>{{ t(`massProduction.portEventType.${event.type}`) }}</span>
                <span>{{ formatDuration(event.durationMs) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-base-300 bg-base-50">
        <button
          class="btn w-full gap-2 transition-all duration-300"
          :class="isEnabled ? 'btn-error' : 'btn-primary'"
          @click="toggleMassProduction"
          :disabled="isToggling || (!isEnabled && !canStart)"
        >
          <span class="material-icons">{{ isEnabled ? 'stop' : 'play_arrow' }}</span>
          {{ isEnabled ? t('massProduction.stopMode') : t('massProduction.startMode') }}
        </button>
        <div v-if="isEnabled" class="text-center mt-2 text-xs text-base-content/60">
          {{ t('massProduction.modeActiveHint') }}
        </div>
      </div>
    </div>

    <dialog class="modal" :class="{ 'modal-open': showFilterModal }">
      <div
        class="modal-box w-11/12 max-w-4xl bg-base-100/95 backdrop-blur-xl border border-base-200 shadow-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div class="px-5 py-3 border-b border-base-200 flex justify-between items-center bg-base-100">
          <div class="flex items-center gap-4">
            <h3 class="font-bold text-lg flex items-center gap-2">
              <div class="p-1.5 bg-primary/10 rounded-lg text-primary">
                <span class="material-icons text-lg">filter_alt</span>
              </div>
              {{ t('massProduction.filterSettings') }}
            </h3>

            <div class="divider divider-horizontal mx-0 h-6"></div>

            <label class="label cursor-pointer gap-2 hover:opacity-80 transition-opacity">
              <span class="label-text font-medium text-sm">{{ t('massProduction.enableFilter') }}</span>
              <input
                type="checkbox"
                class="toggle toggle-primary toggle-sm"
                v-model="massProductionStore.isFilterEnabled"
              />
            </label>
          </div>

          <button class="btn btn-sm btn-ghost btn-circle" @click="showFilterModal = false">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="p-5 overflow-y-auto flex-1 custom-scrollbar">
          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity duration-300"
            :class="{ 'opacity-50 grayscale pointer-events-none': !massProductionStore.isFilterEnabled }"
          >
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between px-1">
                <span class="text-xs font-bold text-success flex items-center gap-1.5">
                  <span class="material-icons text-sm">check_circle</span>
                  {{ t('massProduction.whitelist') }}
                </span>
                <button
                  class="btn btn-xs btn-ghost gap-1 text-success hover:bg-success/10 h-6 min-h-0"
                  @click="addRule('whitelist')"
                >
                  <span class="material-icons text-xs">add</span>
                  {{ t('massProduction.addRule') }}
                </button>
              </div>

              <div
                class="bg-base-200/50 rounded-xl border border-base-200 h-[220px] overflow-y-auto custom-scrollbar p-2 relative"
              >
                <transition-group name="list" tag="div" class="space-y-2">
                  <div
                    v-for="rule in massProductionStore.whitelist"
                    :key="rule.id"
                    class="group flex items-center gap-2 bg-base-100 p-2 rounded-lg border border-base-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <input type="checkbox" class="checkbox checkbox-xs checkbox-success" v-model="rule.enabled" />
                    <select
                      class="select select-bordered select-xs w-24 focus:border-success focus:outline-none text-xs px-2"
                      v-model="rule.field"
                    >
                      <option value="vid_pid">{{ t('massProduction.ruleType.vid_pid') }}</option>
                      <option value="serial_number">{{ t('massProduction.ruleType.serial_number') }}</option>
                      <option value="location_path">{{ t('massProduction.ruleType.location_path') }}</option>
                      <option value="port_name">{{ t('massProduction.ruleType.port_name') }}</option>
                    </select>
                    <input
                      type="text"
                      class="input input-bordered input-xs flex-1 focus:border-success focus:outline-none font-mono text-xs"
                      v-model="rule.value"
                      :placeholder="t('massProduction.valuePlaceholder')"
                    />
                    <button
                      class="btn btn-ghost btn-xs btn-circle text-base-content/30 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 min-h-0"
                      @click="massProductionStore.removeRule('whitelist', rule.id)"
                    >
                      <span class="material-icons text-sm">close</span>
                    </button>
                  </div>
                </transition-group>

                <div
                  v-if="massProductionStore.whitelist.length === 0"
                  class="absolute inset-0 flex flex-col items-center justify-center text-base-content/30 pointer-events-none"
                >
                  <span class="material-icons text-3xl mb-1">rule</span>
                  <span class="text-[10px]">{{ t('massProduction.noWhitelistRules') }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between px-1">
                <span class="text-xs font-bold text-error flex items-center gap-1.5">
                  <span class="material-icons text-sm">cancel</span>
                  {{ t('massProduction.blacklist') }}
                </span>
                <button
                  class="btn btn-xs btn-ghost gap-1 text-error hover:bg-error/10 h-6 min-h-0"
                  @click="addRule('blacklist')"
                >
                  <span class="material-icons text-xs">add</span>
                  {{ t('massProduction.addRule') }}
                </button>
              </div>

              <div
                class="bg-base-200/50 rounded-xl border border-base-200 h-[220px] overflow-y-auto custom-scrollbar p-2 relative"
              >
                <transition-group name="list" tag="div" class="space-y-2">
                  <div
                    v-for="rule in massProductionStore.blacklist"
                    :key="rule.id"
                    class="group flex items-center gap-2 bg-base-100 p-2 rounded-lg border border-base-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <input type="checkbox" class="checkbox checkbox-xs checkbox-error" v-model="rule.enabled" />
                    <select
                      class="select select-bordered select-xs w-24 focus:border-error focus:outline-none text-xs px-2"
                      v-model="rule.field"
                    >
                      <option value="vid_pid">{{ t('massProduction.ruleType.vid_pid') }}</option>
                      <option value="serial_number">{{ t('massProduction.ruleType.serial_number') }}</option>
                      <option value="location_path">{{ t('massProduction.ruleType.location_path') }}</option>
                      <option value="port_name">{{ t('massProduction.ruleType.port_name') }}</option>
                    </select>
                    <input
                      type="text"
                      class="input input-bordered input-xs flex-1 focus:border-error focus:outline-none font-mono text-xs"
                      v-model="rule.value"
                      :placeholder="t('massProduction.valuePlaceholder')"
                    />
                    <button
                      class="btn btn-ghost btn-xs btn-circle text-base-content/30 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 min-h-0"
                      @click="massProductionStore.removeRule('blacklist', rule.id)"
                    >
                      <span class="material-icons text-sm">close</span>
                    </button>
                  </div>
                </transition-group>

                <div
                  v-if="massProductionStore.blacklist.length === 0"
                  class="absolute inset-0 flex flex-col items-center justify-center text-base-content/30 pointer-events-none"
                >
                  <span class="material-icons text-3xl mb-1">block</span>
                  <span class="text-[10px]">{{ t('massProduction.noBlacklistRules') }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-base-200">
            <h4 class="font-bold text-xs mb-3 flex items-center gap-2 opacity-80">
              <span class="badge badge-primary badge-xs">LIVE</span>
              {{ t('massProduction.previewMatchedPorts') }}
            </h4>
            <div class="bg-base-300/30 rounded-xl p-3 min-h-[80px] max-h-[140px] overflow-y-auto custom-scrollbar">
              <transition-group name="list" tag="div" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <div
                  v-for="port in previewPorts"
                  :key="port.id"
                  class="flex items-center gap-3 p-2 bg-base-100 rounded-lg border border-base-200 shadow-sm transition-all hover:scale-[1.01]"
                >
                  <div class="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center text-success">
                    <span class="material-icons text-sm">usb</span>
                  </div>
                  <div class="flex flex-col min-w-0 flex-1">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-xs truncate">{{ port.name }}</span>
                      <span class="text-[10px] font-mono opacity-50 bg-base-200 px-1 rounded"
                        >{{ port.vid }}:{{ port.pid }}</span
                      >
                    </div>
                    <span class="text-[10px] opacity-60 truncate">{{
                      port.chip || t('massProduction.unknownChip')
                    }}</span>
                  </div>
                </div>
              </transition-group>

              <div
                v-if="previewPorts.length === 0"
                class="h-full flex flex-col items-center justify-center text-base-content/40 py-2"
              >
                <span class="material-icons text-2xl mb-1 opacity-50">search_off</span>
                <p class="text-[10px]">{{ t('massProduction.noPortsMatches') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop bg-base-300/50 backdrop-blur-sm">
        <button @click="showFilterModal = false">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { listen } from '@tauri-apps/api/event';
import { appDataDir } from '@tauri-apps/api/path';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useMassProductionStore, type FilterType } from '../stores/massProductionStore';
import { useDeviceStore } from '../stores/deviceStore';
import { useWriteFlashStore } from '../stores/writeFlashStore';
import { useStubConfigStore } from '../stores/stubConfigStore';
import type { ChipModel } from '../config/chips';
import type { MassProductionPortStatus, MassProductionStartRequest } from '../types/massProduction';
import FlashFileCard from '../components/FlashFileCard.vue';

const { t } = useI18n();

const massProductionStore = useMassProductionStore();
const deviceStore = useDeviceStore();
const writeFlashStore = useWriteFlashStore();
const stubConfigStore = useStubConfigStore();

const { selectedChip, chipSearchInput, filteredChips, showChipDropdown, selectedMemoryType, availableMemoryTypes } =
  storeToRefs(deviceStore);
const {
  ports,
  isEnabled,
  isRunning,
  sessionId,
  currentSession,
  recentSessionLogs,
  sessionLogs,
  isAutoDownloadSyncing,
} = storeToRefs(massProductionStore);

const isRefreshing = ref(false);
const isToggling = ref(false);
const showFilterModal = ref(false);
const selectedSessionId = ref<number | null>(null);
const unlistenFns: Array<() => void> = [];

const selectedSessionForDetail = computed(() => {
  if (selectedSessionId.value !== null) {
    if (currentSession.value?.sessionId === selectedSessionId.value) {
      return currentSession.value;
    }

    const matchedSession = sessionLogs.value.find(session => session.sessionId === selectedSessionId.value);
    if (matchedSession) {
      return matchedSession;
    }
  }

  return currentSession.value || recentSessionLogs.value[0] || null;
});

const failedPortEvents = computed(() => {
  if (!selectedSessionForDetail.value) {
    return [];
  }

  return selectedSessionForDetail.value.portEvents.filter(
    event => event.type === 'error' || event.type === 'disconnected'
  );
});

const autoDownloadModel = computed({
  get: () => massProductionStore.autoDownload,
  set: value => {
    void massProductionStore.setAutoDownload(value).catch(error => {
      alert(`${t('massProduction.autoDownloadToggleFailed')}: ${error}`);
    });
  },
});

const maxConcurrencyModel = computed({
  get: () => massProductionStore.maxConcurrency,
  set: value => massProductionStore.setMaxConcurrency(value),
});

const previewPorts = computed(() => {
  if (!massProductionStore.isFilterEnabled) return ports.value;
  return ports.value.filter(port => massProductionStore.isPortAllowed(port));
});

const canStart = computed(() => {
  return (
    !!selectedChip.value &&
    !!selectedMemoryType.value &&
    writeFlashStore.selectedFiles.length > 0 &&
    writeFlashStore.canStartFlashing
  );
});

const handleFocus = (type: 'chip') => {
  if (type === 'chip') {
    deviceStore.setTempChipInput(chipSearchInput.value);
    deviceStore.setChipSearchInput('');
    deviceStore.setShowChipDropdown(true);
  }
};

const handleBlur = (type: 'chip') => {
  setTimeout(() => {
    if (type === 'chip' && showChipDropdown.value) {
      if (chipSearchInput.value === '') {
        deviceStore.setChipSearchInput(selectedChip.value?.name || '');
      }
      deviceStore.setShowChipDropdown(false);
    }
  }, 200);
};

const handleChipKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown' && !showChipDropdown.value) {
    handleFocus('chip');
  }
};

const selectChip = (chip: ChipModel) => {
  deviceStore.setSelectedChip(chip);
  deviceStore.setShowChipDropdown(false);
};

const toggleChipDropdown = () => {
  if (showChipDropdown.value) {
    deviceStore.setShowChipDropdown(false);
  } else {
    handleFocus('chip');
  }
};

const addFile = async () => {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      multiple: true,
      filters: [{ name: 'Firmware', extensions: ['bin', 'hex', 'elf', 'axf'] }],
    });

    if (!selected) return;

    const paths = Array.isArray(selected) ? selected : [selected];
    paths.forEach(path => {
      const name = path.split(/[\\/]/).pop() || path;
      writeFlashStore.addFile({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        path,
        address: writeFlashStore.isAutoAddressFile(name) ? '' : '0x10000000',
        addressError: '',
        size: 0,
      });
    });
  } catch (error) {
    console.error('File select failed:', error);
  }
};

const parseFlashAddressForMassProduction = (file: { name: string; address?: string }) => {
  if (writeFlashStore.isAutoAddressFile(file.name)) {
    return 0;
  }

  const rawAddress = (file.address || '').trim();
  if (!rawAddress) {
    throw new Error(`${file.name}: ${t('writeFlash.validation.addressRequired')}`);
  }

  const hexPattern = /^0x[0-9a-fA-F]+$/;
  if (!hexPattern.test(rawAddress)) {
    throw new Error(`${file.name}: ${t('writeFlash.validation.invalidAddress')}`);
  }

  const parsedAddress = Number.parseInt(rawAddress, 16);
  if (!Number.isInteger(parsedAddress) || parsedAddress < 0 || parsedAddress > 0xffffffff) {
    throw new Error(`${file.name}: ${t('writeFlash.validation.addressTooLarge')}`);
  }

  return parsedAddress;
};

const createStartRequest = async (): Promise<MassProductionStartRequest> => {
  const stubPath =
    stubConfigStore.applyStubConfig && stubConfigStore.isConfigValid
      ? `${await appDataDir()}/stub_config/draft.json`
      : '';

  const baudRate = Number.parseInt(deviceStore.baudRateInput, 10);

  return {
    chip_model: selectedChip.value!.id,
    memory_type: selectedMemoryType.value!,
    baud_rate: Number.isNaN(baudRate) ? undefined : baudRate,
    stub_path: stubPath,
    before_operation: deviceStore.downloadBehavior.before,
    after_operation: deviceStore.downloadBehavior.after,
    files: writeFlashStore.selectedFiles.map(file => ({
      file_path: file.path,
      address: parseFlashAddressForMassProduction(file),
    })),
    verify: true,
    no_compress: false,
    erase_all: false,
    auto_download: massProductionStore.autoDownload,
    max_concurrency: massProductionStore.maxConcurrency,
    is_filter_enabled: massProductionStore.isFilterEnabled,
    whitelist: massProductionStore.whitelist,
    blacklist: massProductionStore.blacklist,
  };
};

const toggleMassProduction = async () => {
  if (isToggling.value) return;

  isToggling.value = true;
  try {
    if (isEnabled.value) {
      await massProductionStore.stopMassProduction();
      return;
    }

    if (!canStart.value) {
      alert(t('massProduction.startHint'));
      return;
    }

    const request = await createStartRequest();
    await massProductionStore.startMassProduction(request);
  } catch (error) {
    alert(`Mass production failed: ${error}`);
  } finally {
    isToggling.value = false;
  }
};

const refreshPorts = async () => {
  if (isRefreshing.value) return;

  isRefreshing.value = true;
  try {
    const triggerFlash = isRunning.value && !massProductionStore.autoDownload;
    await massProductionStore.refreshMassProduction(triggerFlash);
  } catch (error) {
    alert(`Refresh failed: ${error}`);
  } finally {
    isRefreshing.value = false;
  }
};

const addRule = (type: FilterType) => {
  massProductionStore.addRule(type, {
    field: 'vid_pid',
    value: '',
    enabled: true,
  });
};

const openMassProductionLogDirectory = async () => {
  try {
    await massProductionStore.openMassProductionLogDirectory();
  } catch (error) {
    alert(`${t('massProduction.openLogDirectoryFailed')}: ${error}`);
  }
};

const PORT_RUNTIME_LOG_PREFIX = 'mass-production-port';

const sanitizePortLogFilenameFragment = (portName: string) => {
  const normalized = portName
    .split('')
    .map(ch => (/^[a-zA-Z0-9_.-]$/.test(ch) ? ch : '_'))
    .join('')
    .replace(/^_+|_+$/g, '');

  const safeName = normalized || 'unknown-port';
  return safeName.slice(0, 80);
};

const getPortLogFileName = (portName: string) => {
  const currentSessionId = sessionId.value;
  if (!currentSessionId || currentSessionId <= 0) {
    return null;
  }

  const sanitizedPortName = sanitizePortLogFilenameFragment(portName);
  return `${PORT_RUNTIME_LOG_PREFIX}-session-${currentSessionId}-${sanitizedPortName}.log`;
};

const getPortLogLabel = (portName: string) => {
  const fileName = getPortLogFileName(portName);
  if (!fileName) {
    return '-';
  }

  return t('massProduction.portLogFile', { file: fileName }) as string;
};

const openPortLog = async (portName: string) => {
  const currentSessionId = sessionId.value;
  if (!currentSessionId || currentSessionId <= 0) {
    alert(t('massProduction.noSessionData'));
    return;
  }

  try {
    await massProductionStore.openMassProductionPortLog(portName, currentSessionId);
  } catch (error) {
    alert(`${t('massProduction.openPortLogFailed')}: ${error}`);
  }
};

const getPortNameClass = (portName: string) => {
  const nameLength = portName.length;

  if (nameLength >= 30) {
    return 'text-xs';
  }

  if (nameLength >= 20) {
    return 'text-sm';
  }

  if (nameLength >= 14) {
    return 'text-base';
  }

  return 'text-lg';
};

const getStatusBadgeClass = (status: MassProductionPortStatus) => {
  switch (status) {
    case 'success':
      return 'badge-success';
    case 'error':
      return 'badge-error';
    case 'flashing':
      return 'badge-primary';
    case 'queued':
      return 'badge-warning';
    case 'disconnected':
      return 'badge-neutral';
    default:
      return 'badge-ghost';
  }
};

const getStatusProgressClass = (status: MassProductionPortStatus) => {
  switch (status) {
    case 'success':
      return 'bg-success';
    case 'error':
      return 'bg-error';
    case 'flashing':
      return 'bg-primary';
    case 'queued':
      return 'bg-warning';
    default:
      return 'bg-base-300';
  }
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const formatDuration = (durationMs?: number) => {
  if (durationMs == null) {
    return '-';
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
};

const selectSession = (sessionId: number) => {
  selectedSessionId.value = sessionId;
};

const isSelectedSession = (sessionId: number) => {
  return selectedSessionForDetail.value?.sessionId === sessionId;
};

watch(
  [currentSession, recentSessionLogs],
  () => {
    if (selectedSessionId.value === null) {
      selectedSessionId.value = currentSession.value?.sessionId ?? recentSessionLogs.value[0]?.sessionId ?? null;
      return;
    }

    const existsInCurrent = currentSession.value?.sessionId === selectedSessionId.value;
    const existsInHistory = sessionLogs.value.some(session => session.sessionId === selectedSessionId.value);

    if (!existsInCurrent && !existsInHistory) {
      selectedSessionId.value = currentSession.value?.sessionId ?? recentSessionLogs.value[0]?.sessionId ?? null;
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await Promise.all([
    massProductionStore.loadFromStorage(),
    massProductionStore.fetchMassProductionLogPaths(),
    deviceStore.loadFromStorage(),
    writeFlashStore.loadFilesFromStorage(),
  ]);

  try {
    const unlistenSnapshot = await listen('mass-production-snapshot', event => {
      massProductionStore.applySnapshot(event.payload as any);
    });

    const unlistenProgress = await listen('mass-production-progress', event => {
      massProductionStore.applyProgressEvent(event.payload as any);
    });

    unlistenFns.push(unlistenSnapshot, unlistenProgress);
  } catch (error) {
    console.warn('Failed to setup mass production listeners:', error);
  }

  await massProductionStore.fetchSnapshot();
  if (ports.value.length === 0) {
    await refreshPorts();
  }
});

onUnmounted(() => {
  unlistenFns.forEach(unlisten => unlisten());
  unlistenFns.length = 0;
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s cubic-bezier(0.55, 0, 0.1, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
