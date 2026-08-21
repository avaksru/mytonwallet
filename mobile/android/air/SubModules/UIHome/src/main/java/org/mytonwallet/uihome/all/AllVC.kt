package org.mytonwallet.uihome.all

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import java.lang.ref.WeakReference
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import org.mytonwallet.app_air.uicomponents.base.WViewControllerWithModelStore
import org.mytonwallet.app_air.uicomponents.extensions.dp
import org.mytonwallet.app_air.uicomponents.extensions.setPaddingLocalized
import org.mytonwallet.app_air.uicomponents.helpers.WFont
import org.mytonwallet.app_air.uicomponents.helpers.typeface
import org.mytonwallet.app_air.uicomponents.widgets.WButton
import org.mytonwallet.app_air.uicomponents.widgets.WLabel
import org.mytonwallet.app_air.uicomponents.widgets.WScrollView
import org.mytonwallet.app_air.uicomponents.widgets.balance.WBalanceView
import org.mytonwallet.app_air.uicomponents.widgets.segmentedControlGroup.WSegmentedControlGroup
import org.mytonwallet.app_air.uicomponents.widgets.setBackgroundColor
import org.mytonwallet.app_air.uisettings.viewControllers.baseCurrency.BaseCurrencyVC
import org.mytonwallet.app_air.walletbasecontext.localization.LocaleController
import org.mytonwallet.app_air.walletbasecontext.models.MBaseCurrency
import org.mytonwallet.app_air.walletbasecontext.theme.ViewConstants
import org.mytonwallet.app_air.walletbasecontext.theme.WColor
import org.mytonwallet.app_air.walletbasecontext.theme.color
import org.mytonwallet.app_air.walletbasecontext.utils.MHistoryTimePeriod
import org.mytonwallet.app_air.walletbasecontext.utils.toBigInteger
import org.mytonwallet.app_air.walletbasecontext.utils.toString
import org.mytonwallet.app_air.walletcore.WalletCore

@SuppressLint("ViewConstructor")
class AllVC(context: Context) : WViewControllerWithModelStore(context) {

    @Suppress("PropertyName")
    override val TAG = "All"

    override val shouldDisplayBottomBar = true

    private val viewModel: AllVM by lazy {
        ViewModelProvider(this)[AllVM::class.java]
    }

    private val currencyButton by lazy {
        WButton(context, WButton.Type.SECONDARY).apply {
            setPadding(12.dp, 6.dp, 12.dp, 6.dp)
            customTextColor = WColor.Tint.color
            setOnClickListener {
                navigationController?.push(BaseCurrencyVC(context))
            }
        }
    }

    private val titleLabel by lazy {
        WLabel(context).apply {
            setStyle(15f)
            setTextColor(WColor.SecondaryText.color)
            text = LocaleController.getString("All Wallets")
            gravity = Gravity.CENTER_HORIZONTAL
        }
    }

    private val balanceView by lazy {
        WBalanceView(context).apply {
            typeface = WFont.Bold.typeface
            primaryColor = WColor.PrimaryText.color
            secondaryColor = WColor.PrimaryText.color
            primarySize = 34f
            decimalsSize = 28f
            currencySize = 30f
            smartDecimalsAlpha = true
            reducedDecimalsAlpha = 191
            smartDecimalsColor = false
        }
    }

    private val changeLabel by lazy {
        WLabel(context).apply {
            setStyle(15f)
            gravity = Gravity.CENTER_HORIZONTAL
        }
    }

    private val periodSelector by lazy {
        WSegmentedControlGroup(context).apply {
            PERIODS.forEach { period ->
                addView(
                    WLabel(context).apply {
                        layoutParams =
                            LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f)
                        setStyle(14f)
                        text = period.localized
                        gravity = Gravity.CENTER
                    }
                )
            }
            setOnSelectedOptionChangeCallback { index ->
                viewModel.selectPeriod(PERIODS[index])
            }
            setDividerColor(Color.TRANSPARENT)
            setSliderColor(WColor.Background.color)
        }
    }

    private val stakingTitleLabel by lazy {
        WLabel(context).apply {
            setStyle(20f, WFont.Bold)
            setTextColor(WColor.PrimaryText.color)
            text = LocaleController.getString("Staking Earnings")
        }
    }

    private val stakingMonthLabel by lazy {
        WLabel(context).apply {
            setStyle(15f)
            setTextColor(WColor.SecondaryText.color)
            text = LocaleController.getString("Earned this month")
        }
    }

    private val stakingMonthValueLabel by lazy {
        WLabel(context).apply {
            setStyle(18f, WFont.Medium)
            setTextColor(WColor.PrimaryText.color)
            gravity = Gravity.END
        }
    }

    private val stakingAllTimeLabel by lazy {
        WLabel(context).apply {
            setStyle(15f)
            setTextColor(WColor.SecondaryText.color)
            text = LocaleController.getString("Earned all time")
        }
    }

    private val stakingAllTimeValueLabel by lazy {
        WLabel(context).apply {
            setStyle(18f, WFont.Medium)
            setTextColor(WColor.PrimaryText.color)
            gravity = Gravity.END
        }
    }
    private val scrollView by lazy {
        val content = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPaddingLocalized(
                ViewConstants.HORIZONTAL_PADDINGS.dp,
                24.dp,
                ViewConstants.HORIZONTAL_PADDINGS.dp,
                24.dp
            )

            addView(
                titleLabel,
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
            )
            addView(
                balanceView,
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = 12.dp }
            )
            addView(
                changeLabel,
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = 8.dp }
            )
            addView(
                periodSelector,
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    40.dp
                ).apply {
                    topMargin = 24.dp
                    bottomMargin = 32.dp
                }
            )

            addStakingSection(this)
        }
        WScrollView(WeakReference(this)).apply {
            addView(
                content,
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
    }

    private fun addStakingSection(container: LinearLayout) {
        container.addView(
            stakingTitleLabel,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = 16.dp }
        )

        val monthRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(
                stakingMonthLabel,
                LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            )
            addView(
                stakingMonthValueLabel,
                LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            )
        }
        container.addView(
            monthRow,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = 12.dp }
        )

        val allTimeRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(
                stakingAllTimeLabel,
                LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            )
            addView(
                stakingAllTimeValueLabel,
                LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            )
        }
        container.addView(
            allTimeRow,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        )
    }

    override fun setupViews() {
        super.setupViews()

        setNavTitle(LocaleController.getString("All"))
        setupNavBar(true)
        navigationBar?.addTrailingView(
            currencyButton,
            ConstraintLayout.LayoutParams(ConstraintLayout.LayoutParams.WRAP_CONTENT, 40.dp)
        )
        updateCurrencyButton()

        view.addView(
            scrollView,
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )

        viewModel.stateFlow
            .onEach { bindState(it) }
            .launchIn(lifecycleScope)

        updateTheme()
    }

    override fun updateTheme() {
        super.updateTheme()
        view.setBackgroundColor(WColor.SecondaryBackground.color)
        periodSelector.updateTheme()
        periodSelector.setBackgroundColor(Color.TRANSPARENT, 24f.dp)
        periodSelector.setSliderColor(WColor.Background.color)
    }

    private fun bindState(state: AllUiState) {
        updateCurrencyButton()
        periodSelector.setSelectedIndex(
            PERIODS.indexOf(state.selectedPeriod),
            shouldAnimate = false
        )

        val baseCurrency = WalletCore.baseCurrency
        balanceView.animateText(
            WBalanceView.AnimateConfig(
                amount = state.totalBalance?.toBigInteger(baseCurrency.decimalsCount),
                decimals = baseCurrency.decimalsCount,
                currency = baseCurrency.sign,
                animated = false,
                setInstantly = true,
                forceCurrencyToRight = LocaleController.isRTL
            )
        )

        val changeAbs = state.balanceChangeAbs
        val changePct = state.balanceChangePct
        if (changeAbs != null) {
            val sign = if (changeAbs >= 0) "+" else ""
            val pctText = changePct?.let { " (${formatPercent(it)})" } ?: ""
            changeLabel.text = "$sign${formatCurrency(changeAbs)}$pctText"
            changeLabel.setTextColor(
                if (changeAbs >= 0) WColor.Green.color else WColor.Red.color
            )
        } else if (state.isLoadingHistory) {
            changeLabel.text = "..."
            changeLabel.setTextColor(WColor.SecondaryText.color)
        } else {
            changeLabel.text = ""
        }

        stakingMonthValueLabel.text =
            formatCurrency(state.stakingMonth ?: 0.0, hideIfZero = state.stakingMonth == null)
        stakingAllTimeValueLabel.text =
            formatCurrency(state.stakingAllTime ?: 0.0, hideIfZero = state.stakingAllTime == null)
    }

    private fun updateCurrencyButton() {
        currencyButton.setText(WalletCore.baseCurrency.currencySymbol)
    }

    private fun formatCurrency(value: Double, hideIfZero: Boolean = false): String {
        if (hideIfZero && value == 0.0) return "-"
        val baseCurrency = WalletCore.baseCurrency
        return value.toString(
            decimals = baseCurrency.decimalsCount,
            currency = baseCurrency.sign,
            currencyDecimals = baseCurrency.decimalsCount,
            smartDecimals = true,
            forceCurrencyToRight = baseCurrency == MBaseCurrency.RUB
        ) ?: "-"
    }

    private fun formatPercent(value: Double): String {
        val sign = if (value >= 0) "+" else ""
        return "$sign%.2f%%".format(value)
    }

    companion object {
        private val PERIODS = arrayOf(
            MHistoryTimePeriod.DAY,
            MHistoryTimePeriod.WEEK,
            MHistoryTimePeriod.MONTH,
            MHistoryTimePeriod.YEAR
        )
    }
}
