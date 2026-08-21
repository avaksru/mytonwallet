package org.mytonwallet.uihome.tabs

import org.mytonwallet.app_air.icons.R
import org.mytonwallet.app_air.walletcontext.globalStorage.WGlobalStorage
import org.mytonwallet.app_air.walletcore.WalletCore
import org.mytonwallet.app_air.walletcore.WalletEvent
import org.mytonwallet.uihome.tabs.views.IBottomNavigationView

object AppTabsManager {

    data class AppTab(
        val id: String,
        val intId: Int,
        val iconRes: Int,
        val filledIconRes: Int,
        val labelKey: String,
        val isRequired: Boolean
    )

    const val TAB_WALLET = "wallet"
    const val TAB_AGENT = "agent"
    const val TAB_EXPLORE = "explore"
    const val TAB_SETTINGS = "settings"
    const val TAB_PORTFOLIO = "portfolio"
    const val TAB_ALL = "all"

    val registeredTabs = listOf(
        AppTab(
            TAB_WALLET,
            IBottomNavigationView.ID_HOME,
            R.drawable.ic_home_thin,
            R.drawable.ic_home_filled,
            "Wallet",
            isRequired = true
        ),
        AppTab(
            TAB_AGENT,
            IBottomNavigationView.ID_AGENT,
            R.drawable.ic_agent_thin,
            R.drawable.ic_agent_filled,
            "Agent",
            isRequired = false
        ),
        AppTab(
            TAB_EXPLORE,
            IBottomNavigationView.ID_EXPLORE,
            R.drawable.ic_explore_thin,
            R.drawable.ic_explore_filled,
            "Explore",
            isRequired = false
        ),
        AppTab(
            TAB_SETTINGS,
            IBottomNavigationView.ID_SETTINGS,
            R.drawable.ic_settings_thin,
            R.drawable.ic_settings_filled,
            "Settings",
            isRequired = true
        ),
        AppTab(
            TAB_PORTFOLIO,
            IBottomNavigationView.ID_PORTFOLIO,
            R.drawable.ic_portfolio_thin,
            R.drawable.ic_portfolio_filled,
            "Portfolio",
            isRequired = false
        ),
        AppTab(
            TAB_ALL,
            IBottomNavigationView.ID_ALL,
            R.drawable.ic_all_thin,
            R.drawable.ic_all_filled,
            "All",
            isRequired = false
        )
    )

    val defaultTabIds = listOf(TAB_WALLET, TAB_AGENT, TAB_EXPLORE, TAB_SETTINGS, TAB_ALL)

    private var _orderedTabIds: List<String>? = null
    val orderedTabIds: List<String>
        get() = _orderedTabIds
            ?: validatedTabOrder(WGlobalStorage.getAppTabOrder()).also { _orderedTabIds = it }

    val orderedTabs: List<AppTab>
        get() = orderedTabIds.mapNotNull(::tabFor)

    val availableTabs: List<AppTab>
        get() = registeredTabs.filter { it.id !in orderedTabIds }

    val isCustomized: Boolean
        get() = orderedTabIds != defaultTabIds

    fun tabFor(id: String): AppTab? = registeredTabs.firstOrNull { it.id == id }

    fun contains(intId: Int): Boolean = orderedTabs.any { it.intId == intId }

    fun setTabIds(ids: List<String>) {
        val validated = validatedTabOrder(ids)
        if (validated == orderedTabIds) return
        _orderedTabIds = validated
        WGlobalStorage.setAppTabOrder(validated)
        WalletCore.notifyEvent(WalletEvent.AppTabsChanged)
    }

    // Drops unknown/duplicate ids and re-appends missing required tabs, so a stale or foreign
    // stored order can never leave the app without the wallet/settings tabs.
    // Also migrates in newly-added tabs (e.g. "All") to existing stored orders.
    private fun validatedTabOrder(raw: List<String>?): List<String> {
        if (raw.isNullOrEmpty()) return defaultTabIds

        // If the stored order matches the old default order, migrate directly to the new default.
        val oldDefaultTabIds = listOf(TAB_WALLET, TAB_AGENT, TAB_EXPLORE, TAB_SETTINGS)
        if (raw == oldDefaultTabIds) return defaultTabIds

        val result = LinkedHashSet<String>()
        raw.forEach { id ->
            if (tabFor(id) != null) result.add(id)
        }
        registeredTabs.forEach { tab ->
            if (tab.isRequired) result.add(tab.id)
        }
        // Migration: ensure the "All" tab is present in older stored orders.
        if (TAB_ALL !in result) {
            val list = result.toMutableList()
            val walletIndex = list.indexOf(TAB_WALLET)
            if (walletIndex >= 0) {
                list.add(walletIndex + 1, TAB_ALL)
            } else {
                list.add(0, TAB_ALL)
            }
            return list
        }
        return result.toList()
    }
}
