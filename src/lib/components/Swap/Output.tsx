import { Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import { atom } from 'jotai'
import { useAtomValue } from 'jotai/utils'
import BrandedFooter from 'lib/components/BrandedFooter'
import { useSwapAmount, useSwapCurrency, useSwapInfo } from 'lib/hooks/swap'
import useCurrencyColor from 'lib/hooks/useCurrencyColor'
import { Field, independentFieldAtom } from 'lib/state/swap'
import styled, { DynamicThemeProvider, ThemedText } from 'lib/theme'
import { PropsWithChildren, useMemo } from 'react'
import { TradeState } from 'state/routing/types'
import { computeFiatValuePriceImpact } from 'utils/computeFiatValuePriceImpact'
import { formatCurrencyAmount } from 'utils/formatCurrencyAmount'

import Column from '../Column'
import Row from '../Row'
import { Balance, InputProps, LoadingSpan } from './Input'
import TokenInput from './TokenInput'

export const colorAtom = atom<string | undefined>(undefined)

const OutputColumn = styled(Column)<{ hasColor: boolean | null }>`
  background-color: ${({ theme }) => theme.module};
  border-radius: ${({ theme }) => theme.borderRadius - 0.25}em;
  padding: 0.75em;
  padding-bottom: 0.5em;
  position: relative;

  // Set transitions to reduce color flashes when switching color/token.
  // When color loads, transition the background so that it transitions from the empty or last state, but not _to_ the empty state.
  transition: ${({ hasColor }) => (hasColor ? 'background-color 0.25s ease-out' : undefined)};
  > {
    // When color is loading, delay the color/stroke so that it seems to transition from the last state.
    transition: ${({ hasColor }) => (hasColor === null ? 'color 0.25s ease-in, stroke 0.25s ease-in' : undefined)};
  }
`

export default function Output({ disabled, focused, children }: PropsWithChildren<InputProps>) {
  const { i18n } = useLingui()

  const {
    trade: { state: tradeState },
    currencyBalances: { [Field.OUTPUT]: balance },
    currencyAmounts: { [Field.INPUT]: inputCurrencyAmount, [Field.OUTPUT]: outputCurrencyAmount },
  } = useSwapInfo()

  const [swapOutputAmount, updateSwapOutputAmount] = useSwapAmount(Field.OUTPUT)
  const [swapOutputCurrency, updateSwapOutputCurrency] = useSwapCurrency(Field.OUTPUT)

  //loading status of the trade
  const isTradeLoading = useMemo(
    () => TradeState.LOADING === tradeState || TradeState.SYNCING === tradeState,
    [tradeState]
  )

  const isDependentField = useAtomValue(independentFieldAtom) !== Field.OUTPUT
  const isLoading = isDependentField && isTradeLoading

  const overrideColor = useAtomValue(colorAtom)
  const dynamicColor = useCurrencyColor(swapOutputCurrency)
  const color = overrideColor || dynamicColor

  // different state true/null/false allow smoother color transition
  const hasColor = swapOutputCurrency ? Boolean(color) || null : false

  const inputUSDC = useUSDCValue(inputCurrencyAmount)
  const outputUSDC = useUSDCValue(outputCurrencyAmount)

  const priceImpact = useMemo(() => {
    const computedChange = computeFiatValuePriceImpact(inputUSDC, outputUSDC)
    return computedChange ? parseFloat(computedChange.multiply(-1)?.toSignificant(3)) : undefined
  }, [inputUSDC, outputUSDC])

  const usdc = useMemo(() => {
    if (outputUSDC) {
      return `$${outputUSDC.toFixed(2)} (${priceImpact && priceImpact > 0 ? '+' : ''}${priceImpact}%)`
    }
    return ''
  }, [priceImpact, outputUSDC])

  return (
    <DynamicThemeProvider color={color}>
      <OutputColumn hasColor={hasColor} gap={0.5}>
        <Row>
          <ThemedText.Subhead1 color="secondary">
            <Trans>For</Trans>
          </ThemedText.Subhead1>
        </Row>
        <TokenInput
          currency={swapOutputCurrency}
          amount={(swapOutputAmount !== undefined ? swapOutputAmount : outputCurrencyAmount?.toSignificant(6)) ?? ''}
          disabled={disabled}
          onChangeInput={updateSwapOutputAmount}
          onChangeCurrency={updateSwapOutputCurrency}
          loading={isLoading}
        >
          <ThemedText.Body2 color="secondary">
            <Row>
              <LoadingSpan $loading={isLoading}>{usdc}</LoadingSpan>
              {balance && (
                <Balance focused={focused}>
                  Balance: <span style={{ userSelect: 'text' }}>{formatCurrencyAmount(balance, 4, i18n.locale)}</span>
                </Balance>
              )}
            </Row>
          </ThemedText.Body2>
        </TokenInput>
        {children}
        <BrandedFooter />
      </OutputColumn>
    </DynamicThemeProvider>
  )
}
