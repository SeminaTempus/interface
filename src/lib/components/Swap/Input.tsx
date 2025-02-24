import { useLingui } from '@lingui/react'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import { useAtomValue } from 'jotai/utils'
import { loadingOpacityCss } from 'lib/css/loading'
import { useSwapAmount, useSwapCurrency, useSwapInfo } from 'lib/hooks/swap'
import { usePrefetchCurrencyColor } from 'lib/hooks/useCurrencyColor'
import { Field, independentFieldAtom } from 'lib/state/swap'
import styled, { ThemedText } from 'lib/theme'
import { useMemo } from 'react'
import { TradeState } from 'state/routing/types'
import { formatCurrencyAmount } from 'utils/formatCurrencyAmount'
import { maxAmountSpend } from 'utils/maxAmountSpend'

import Column from '../Column'
import Row from '../Row'
import TokenImg from '../TokenImg'
import TokenInput from './TokenInput'

export const LoadingSpan = styled.span<{ $loading: boolean }>`
  ${loadingOpacityCss};
`

export const Balance = styled(ThemedText.Body2)<{ focused: boolean }>`
  opacity: ${({ focused }) => (focused ? 1 : 0)};
  transition: opacity 0.25s ${({ focused }) => (focused ? 'ease-in' : 'ease-out')};
`

const InputColumn = styled(Column)<{ approved?: boolean }>`
  margin: 0.75em;
  position: relative;

  ${TokenImg} {
    filter: ${({ approved }) => (approved ? undefined : 'saturate(0) opacity(0.4)')};
    transition: filter 0.25s;
  }
`

export interface InputProps {
  disabled: boolean
  focused: boolean
}

export default function Input({ disabled, focused }: InputProps) {
  const { i18n } = useLingui()
  const {
    trade: { state: tradeState },
    currencyBalances: { [Field.INPUT]: balance },
    currencyAmounts: { [Field.INPUT]: inputCurrencyAmount },
  } = useSwapInfo()
  const inputUSDC = useUSDCValue(inputCurrencyAmount)

  const [swapInputAmount, updateSwapInputAmount] = useSwapAmount(Field.INPUT)
  const [swapInputCurrency, updateSwapInputCurrency] = useSwapCurrency(Field.INPUT)

  // extract eagerly in case of reversal
  usePrefetchCurrencyColor(swapInputCurrency)

  const isTradeLoading = useMemo(
    () => TradeState.LOADING === tradeState || TradeState.SYNCING === tradeState,
    [tradeState]
  )
  const isDependentField = useAtomValue(independentFieldAtom) !== Field.INPUT
  const isLoading = isDependentField && isTradeLoading

  //TODO(ianlapham): mimic logic from app swap page
  const mockApproved = true

  // account for gas needed if using max on native token
  const maxAmount = useMemo(() => maxAmountSpend(balance), [balance])

  const onMax = useMemo(() => {
    if (maxAmount?.greaterThan(0)) {
      return () => updateSwapInputAmount(maxAmount.toExact())
    }
    return
  }, [maxAmount, updateSwapInputAmount])

  return (
    <InputColumn gap={0.5} approved={mockApproved}>
      <TokenInput
        currency={swapInputCurrency}
        amount={(swapInputAmount !== undefined ? swapInputAmount : inputCurrencyAmount?.toSignificant(6)) ?? ''}
        disabled={disabled}
        onMax={onMax}
        onChangeInput={updateSwapInputAmount}
        onChangeCurrency={updateSwapInputCurrency}
        loading={isLoading}
      >
        <ThemedText.Body2 color="secondary">
          <Row>
            <LoadingSpan $loading={isLoading}>{inputUSDC ? `$${inputUSDC.toFixed(2)}` : '-'}</LoadingSpan>
            {balance && (
              <Balance color={inputCurrencyAmount?.greaterThan(balance) ? 'error' : undefined} focused={focused}>
                Balance: <span style={{ userSelect: 'text' }}>{formatCurrencyAmount(balance, 4, i18n.locale)}</span>
              </Balance>
            )}
          </Row>
        </ThemedText.Body2>
      </TokenInput>
      <Row />
    </InputColumn>
  )
}
