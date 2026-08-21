package org.mytonwallet.uihome.all

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import java.math.BigInteger
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.mytonwallet.app_air.walletbasecontext.models.MBaseCurrency
import org.mytonwallet.app_air.walletbasecontext.utils.MHistoryTimePeriod
import org.mytonwallet.app_air.walletcontext.globalStorage.WGlobalStorage
import org.mytonwallet.app_air.walletcontext.utils.CoinUtils
import org.mytonwallet.app_air.walletcore.TONCOIN_SLUG
import org.mytonwallet.app_air.walletcore.WalletCore
import org.mytonwallet.app_air.walletcore.WalletEvent
import org.mytonwallet.app_air.walletcore.api.fetchPortfolioNetWorthHistory
import org.mytonwallet.app_air.walletcore.api.getStakingHistory
import org.mytonwallet.app_air.walletcore.models.MAccount
import org.mytonwallet.app_air.walletcore.models.MTokenBalance
import org.mytonwallet.app_air.walletcore.stores.AccountStore
import org.mytonwallet.app_air.walletcore.stores.BalanceStore
import org.mytonwallet.app_air.walletcore.stores.StakingStore
import org.mytonwallet.app_air.walletcore.stores.TokenStore

class AllVM :
    ViewModel(),
    WalletCore.EventObserver {

    private val _stateFlow = MutableStateFlow(AllUiState())
    val stateFlow: StateFlow<AllUiState> = _stateFlow.asStateFlow()

    private var historyJob: Job? = null
    private var stakingJob: Job? = null

    init {
        WalletCore.registerObserver(this)
        refresh()
    }

    override fun onCleared() {
        WalletCore.unregisterObserver(this)
        super.onCleared()
    }

    override fun onWalletEvent(event: WalletEvent) {
        when (event) {
            is WalletEvent.BalanceChanged,
            is WalletEvent.TokensChanged,
            is WalletEvent.StakingDataUpdated,
            is WalletEvent.BaseCurrencyChanged,
            is WalletEvent.AccountChangedInApp -> {
                refresh()
            }

            else -> {}
        }
    }

    fun refresh() {
        val baseCurrency = WalletCore.baseCurrency
        val totalBalance = BalanceStore.totalBalanceInBaseCurrencyForAllAccounts()
        val balance24h = BalanceStore.totalBalance24hInBaseCurrencyForAllAccounts()

        _stateFlow.value = _stateFlow.value.copy(
            totalBalance = totalBalance,
            balanceChangeAbs = null,
            balanceChangePct = null,
            isLoadingHistory = true,
            hasError = false,
            stakingAllTime = null,
            stakingMonth = null,
            isLoadingStaking = true
        )

        val period = _stateFlow.value.selectedPeriod
        if (period == MHistoryTimePeriod.DAY) {
            val change = if (balance24h != null) totalBalance - balance24h else null
            val pct = calculatePercentChange(balance24h, totalBalance)
            _stateFlow.value = _stateFlow.value.copy(
                balanceChangeAbs = change,
                balanceChangePct = pct,
                isLoadingHistory = false
            )
        } else {
            loadHistoryForPeriod(period, baseCurrency)
        }

        loadStakingEarnings(baseCurrency)
    }

    fun selectPeriod(period: MHistoryTimePeriod) {
        if (_stateFlow.value.selectedPeriod == period) return
        _stateFlow.value = _stateFlow.value.copy(selectedPeriod = period)
        refresh()
    }

    private fun loadHistoryForPeriod(period: MHistoryTimePeriod, baseCurrency: MBaseCurrency) {
        historyJob?.cancel()
        historyJob = viewModelScope.launch {
            try {
                val accounts = withContext(Dispatchers.Default) {
                    WGlobalStorage.accountIds().mapNotNull { AccountStore.accountById(it) }
                }
                if (accounts.isEmpty()) {
                    _stateFlow.value = _stateFlow.value.copy(isLoadingHistory = false)
                    return@launch
                }

                val responses = mutableListOf<Pair<Long, Double>>()
                var failed = false

                accounts.forEach { account ->
                    if (!isActive) return@forEach
                    val wallets = account.walletAddresses()
                    if (wallets.isEmpty()) return@forEach
                    try {
                        val response = WalletCore.fetchPortfolioNetWorthHistory(
                            accountId = account.accountId,
                            wallets = wallets,
                            baseCurrency = baseCurrency,
                            period = period
                        )
                        response?.points?.mapNotNull { point ->
                            val timestamp = point.getOrNull(0)?.toLong()
                            val value = point.getOrNull(1)
                            if (timestamp != null && value != null) {
                                timestamp to value
                            } else {
                                null
                            }
                        }?.let { responses.addAll(it) }
                    } catch (_: CancellationException) {
                        throw CancellationException()
                    } catch (_: Throwable) {
                        failed = true
                    }
                }

                if (!isActive) return@launch

                val aggregated = responses.groupBy({ it.first }, { it.second })
                    .mapValues { (_, values) -> values.sum() }
                    .toSortedMap()

                val firstValue: Double? = aggregated.values.firstOrNull()
                val lastValue: Double? = aggregated.values.lastOrNull()
                val change = if (firstValue != null &&
                    lastValue != null
                ) {
                    lastValue - firstValue
                } else {
                    null
                }
                val pct = calculatePercentChange(firstValue, lastValue)

                _stateFlow.value = _stateFlow.value.copy(
                    balanceChangeAbs = change,
                    balanceChangePct = pct,
                    isLoadingHistory = false,
                    hasError = failed && change == null
                )
            } catch (_: CancellationException) {
            } catch (_: Throwable) {
                _stateFlow.value = _stateFlow.value.copy(
                    isLoadingHistory = false,
                    hasError = true
                )
            }
        }
    }
    private fun loadStakingEarnings(baseCurrency: MBaseCurrency) {
        stakingJob?.cancel()
        stakingJob = viewModelScope.launch {
            try {
                val accountIds = withContext(Dispatchers.Default) {
                    WGlobalStorage.accountIds()
                }
                if (accountIds.isEmpty()) {
                    _stateFlow.value = _stateFlow.value.copy(isLoadingStaking = false)
                    return@launch
                }

                var allTime = 0.0
                var monthProfit = 0.0
                var hasData = false
                val monthAgo = System.currentTimeMillis() - 30L * 24 * 60 * 60 * 1000

                accountIds.forEach { accountId ->
                    if (!isActive) return@forEach
                    val stakingState = StakingStore.getStakingState(accountId)
                    if (stakingState != null) {
                        hasData = true
                        allTime += stakingState.totalProfitInBaseCurrency()
                        allTime += stakingState.totalUnclaimedRewardsInBaseCurrency()
                    }

                    try {
                        val history = WalletCore.getStakingHistory(accountId)
                        history.forEach { item ->
                            val timestampMs = item.timestamp * 1000L
                            if (timestampMs >= monthAgo) {
                                val amount = CoinUtils.fromDecimal(item.profit, 9)
                                    ?: BigInteger.ZERO
                                val value = amount.toBaseCurrencyValue(TONCOIN_SLUG)
                                if (value != null) {
                                    hasData = true
                                    monthProfit += value
                                }
                            }
                        }
                    } catch (_: CancellationException) {
                        throw CancellationException()
                    } catch (_: Throwable) {
                    }
                }

                if (!isActive) return@launch

                _stateFlow.value = _stateFlow.value.copy(
                    stakingAllTime = if (hasData) allTime else null,
                    stakingMonth = if (hasData) monthProfit else null,
                    isLoadingStaking = false
                )
            } catch (_: CancellationException) {
            } catch (_: Throwable) {
                _stateFlow.value = _stateFlow.value.copy(isLoadingStaking = false)
            }
        }
    }

    private fun MAccount.walletAddresses(): List<String> = byChain.values.map {
        it.address
    }.distinct().filter { it.isNotBlank() }

    private fun BigInteger.toBaseCurrencyValue(tokenSlug: String): Double? {
        val token = TokenStore.getToken(tokenSlug) ?: return null
        return MTokenBalance.fromParameters(token, this)?.toBaseCurrency
    }

    private fun calculatePercentChange(start: Double?, end: Double?): Double? {
        if (start == null || end == null || start == 0.0) return null
        return ((end - start) / start) * 100.0
    }
}
