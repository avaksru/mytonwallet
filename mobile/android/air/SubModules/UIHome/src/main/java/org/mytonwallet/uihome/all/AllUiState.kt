package org.mytonwallet.uihome.all

import org.mytonwallet.app_air.walletbasecontext.utils.MHistoryTimePeriod

data class AllUiState(
    val totalBalance: Double? = null,
    val balanceChangeAbs: Double? = null,
    val balanceChangePct: Double? = null,
    val selectedPeriod: MHistoryTimePeriod = DEFAULT_PERIOD,
    val isLoadingHistory: Boolean = false,
    val stakingAllTime: Double? = null,
    val stakingMonth: Double? = null,
    val isLoadingStaking: Boolean = false,
    val hasError: Boolean = false
) {
    companion object {
        val DEFAULT_PERIOD = MHistoryTimePeriod.DAY
    }
}
